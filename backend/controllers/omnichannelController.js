const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const ConversationMessage = require('../models/ConversationMessage');
const Ticket = require('../models/Ticket');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { getTenantFilter, getTenantId, getWorkspaceIdentity } = require('../utils/tenantScope');
const { evaluateTicketPriority } = require('../services/ticketPriorityService');
const { calculateInitialSla, evaluateSlaStatus } = require('../services/ticketSlaService');

/**
 * @desc    Get tenant conversations (Unified Inbox)
 * @route   GET /api/support/conversations
 * @access  Private
 */
const getConversations = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const { channel, status } = req.query;

    const query = { ...tenantFilter };
    if (channel && channel !== 'all') query.channel = channel;
    if (status) query.status = status;

    const conversations = await Conversation.find(query)
      .populate('customer', 'companyName contactPerson email customerCode')
      .populate('lead', 'contactName company email phone stage')
      .populate('ticket', 'ticketCode title priority status slaStatus assignedEmployee')
      .populate('assignedTo', 'name email role')
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, count: conversations.length, data: conversations });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get conversation by ID with message history
 * @route   GET /api/support/conversations/:id
 * @access  Private
 */
const getConversationById = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const conversation = await Conversation.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('customer', 'companyName contactPerson email customerCode revenueGenerated')
      .populate('lead', 'contactName company email phone stage')
      .populate('ticket')
      .populate('assignedTo', 'name email role');

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const messageQuery = { conversation: conversation._id, tenant: conversation.tenant };
    if (req.user.role === 'customer') {
      messageQuery.isInternal = false;
    }

    const messages = await ConversationMessage.find(messageQuery).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Post message or internal note to conversation
 * @route   POST /api/support/conversations/:id/messages
 * @access  Private
 */
const postConversationMessage = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const conversation = await Conversation.findOne({ _id: req.params.id, ...tenantFilter });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const { body, isInternal, attachments } = req.body;
    if ((!body || !body.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, error: 'Message body or attachment is required' });
    }

    const internalFlag = isInternal === true || isInternal === 'true';

    const message = await ConversationMessage.create({
      tenant: conversation.tenant,
      conversation: conversation._id,
      ticket: conversation.ticket || null,
      senderType: req.user.role === 'customer' ? 'customer' : 'agent',
      senderUser: req.user._id,
      senderEmail: req.user.email,
      senderName: req.user.name,
      channel: conversation.channel,
      direction: internalFlag ? 'internal' : (req.user.role === 'customer' ? 'inbound' : 'outbound'),
      subject: conversation.subject,
      body: (body || 'Attachment uploaded').trim(),
      attachments: attachments || [],
      isInternal: internalFlag,
    });

    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = (body || 'Attachment uploaded').trim().slice(0, 120);
    await conversation.save();

    if (conversation.ticket) {
      const ticket = await Ticket.findOne({ _id: conversation.ticket, tenant: conversation.tenant });
      if (ticket) {
        ticket.comments.push({
          comment: (body || 'Attachment uploaded').trim(),
          commentedBy: req.user._id,
          isInternal: internalFlag,
          attachments: attachments || [],
          createdAt: new Date(),
        });
        if (!internalFlag && req.user.role !== 'customer' && !ticket.firstRespondedAt) {
          ticket.firstRespondedAt = new Date();
        }
        ticket.slaStatus = evaluateSlaStatus(ticket);
        await ticket.save();
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('conversation_message_added', {
        conversationId: conversation._id,
        message,
      });
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Dedicated Support Email Mailbox Intake Flow (Appends to existing open ticket OR creates new ticket + Noreply Acknowledgment)
 * @route   POST /api/support/public/email-intake
 * @access  Public
 */
const publicEmailSupportIntake = async (req, res) => {
  try {
    const { tenantId, workspaceKey, senderName, senderEmail, subject, body, attachments } = req.body;

    if (!senderEmail || !body || (!tenantId && !workspaceKey)) {
      return res.status(400).json({ success: false, error: 'Sender email, body content, and workspace identifier are required.' });
    }

    const cleanEmail = senderEmail.trim().toLowerCase();
    const rawTid = tenantId || workspaceKey;
    const tenantObjId = mongoose.Types.ObjectId.isValid(rawTid) ? new mongoose.Types.ObjectId(rawTid) : null;

    const tenant = await Tenant.findOne({ $or: [{ _id: tenantObjId }, { _id: rawTid }] });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Invalid or unconfigured workspace tenant identifier.' });
    }

    const tid = tenant._id;

    // 1. Match Lead or Customer
    let matchedCustomer = await Customer.findOne({ tenant: tid, email: cleanEmail });
    let matchedLead = null;

    if (!matchedCustomer) {
      matchedLead = await Lead.findOne({ tenant: tid, email: cleanEmail });
      if (!matchedLead) {
        matchedLead = await Lead.create({
          tenant: tid,
          contactName: senderName ? senderName.trim() : cleanEmail.split('@')[0],
          company: senderName ? `${senderName.trim()} Company` : cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '+1 555-0000',
          leadSource: 'Support Care Mailbox',
          stage: 'New',
          stageKey: 'NEW',
        });
      }
    }

    // 2. Check for an existing OPEN ticket for the same contact
    const contactFilter = matchedCustomer ? { customer: matchedCustomer._id } : { lead: matchedLead._id };
    const existingOpenTicket = await Ticket.findOne({
      tenant: tid,
      ...contactFilter,
      status: { $nin: ['Resolved', 'Closed'] },
    }).sort({ updatedAt: -1 });

    let ticket;
    let conversation;
    let isAppended = false;

    if (existingOpenTicket) {
      // Rule: Append message to existing open ticket and conversation!
      ticket = existingOpenTicket;
      isAppended = true;

      ticket.comments.push({
        comment: body.trim(),
        isInternal: false,
        attachments: attachments || [],
        createdAt: new Date(),
      });

      // Update status to Waiting for Agent if customer sent reply
      ticket.status = ticket.assignedEmployee ? 'Assigned' : 'Waiting for Agent';
      ticket.slaStatus = evaluateSlaStatus(ticket);
      await ticket.save();

      conversation = await Conversation.findOne({ _id: ticket.conversation, tenant: tid });
      if (conversation) {
        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = body.trim().slice(0, 120);
        await conversation.save();

        await ConversationMessage.create({
          tenant: tid,
          conversation: conversation._id,
          ticket: ticket._id,
          senderType: matchedCustomer ? 'customer' : 'lead',
          senderEmail: cleanEmail,
          senderName: senderName || cleanEmail.split('@')[0],
          channel: 'email',
          direction: 'inbound',
          subject: subject || `Re: ${ticket.title}`,
          body: body.trim(),
          attachments: attachments || [],
          isInternal: false,
        });
      }
    } else {
      // Rule: Issue is new or previous ticket is closed -> Create a NEW ticket & conversation!
      const priorityResult = await evaluateTicketPriority({
        title: subject || 'Support Request via Mailbox',
        description: body,
        customerId: matchedCustomer ? matchedCustomer._id : null,
        tenantId: tid,
      });

      const slaDates = calculateInitialSla(priorityResult.priority);

      const convKey = `CONV-MAIL-${Math.floor(100000 + Math.random() * 900000)}`;
      conversation = await Conversation.create({
        tenant: tid,
        conversationKey: convKey,
        channel: 'email',
        status: 'open',
        subject: subject || 'Support Email Request',
        participants: [{ email: cleanEmail, name: senderName || cleanEmail.split('@')[0], role: matchedCustomer ? 'customer' : 'lead' }],
        customer: matchedCustomer ? matchedCustomer._id : null,
        lead: matchedLead ? matchedLead._id : null,
        lastMessageAt: new Date(),
        lastMessagePreview: body.trim().slice(0, 120),
      });

      ticket = await Ticket.create({
        tenant: tid,
        title: subject || 'Support Email Request',
        description: body.trim(),
        category: 'Support Mailbox',
        channel: 'email',
        priority: priorityResult.priority,
        priorityExplanation: priorityResult.priorityExplanation,
        priorityDrivers: priorityResult.priorityDrivers,
        status: 'Open',
        customer: matchedCustomer ? matchedCustomer._id : null,
        lead: matchedLead ? matchedLead._id : null,
        conversation: conversation._id,
        firstResponseDueAt: slaDates.firstResponseDueAt,
        resolutionDueAt: slaDates.resolutionDueAt,
        slaStatus: slaDates.slaStatus,
        acknowledgmentSentAt: new Date(),
        attachments: attachments || [],
      });

      conversation.ticket = ticket._id;
      await conversation.save();

      await ConversationMessage.create({
        tenant: tid,
        conversation: conversation._id,
        ticket: ticket._id,
        senderType: matchedCustomer ? 'customer' : 'lead',
        senderEmail: cleanEmail,
        senderName: senderName || cleanEmail.split('@')[0],
        channel: 'email',
        direction: 'inbound',
        subject: subject || 'Support Email Request',
        body: body.trim(),
        attachments: attachments || [],
        isInternal: false,
      });
    }

    // 3. Automated Customer-Facing Noreply Acknowledgment Response
    const ackBody = `Thank you for contacting Support Care. We have received your issue (Ticket Ref: ${ticket.ticketCode}) and an assigned agent will get in touch with you shortly.`;

    await ConversationMessage.create({
      tenant: tid,
      conversation: conversation._id,
      ticket: ticket._id,
      senderType: 'system',
      senderName: 'Support Care Automated System',
      channel: 'email',
      direction: 'outbound',
      subject: `[Acknowledgment] We received your issue - ${ticket.ticketCode}`,
      body: ackBody,
      isInternal: false,
    });

    // 4. Log Timeline Events
    if (matchedCustomer) {
      matchedCustomer.activities = matchedCustomer.activities || [];
      matchedCustomer.activities.push({
        type: 'System',
        description: `${isAppended ? 'Appended email to existing' : 'Created new'} Support Ticket ${ticket.ticketCode} ("${ticket.title}").`,
        date: new Date(),
      });
      await matchedCustomer.save();
    }
    if (matchedLead) {
      matchedLead.activityLog = matchedLead.activityLog || [];
      matchedLead.activityLog.push({
        type: 'System',
        description: `${isAppended ? 'Appended email to existing' : 'Created new'} Support Ticket ${ticket.ticketCode} ("${ticket.title}").`,
        createdAt: new Date(),
      });
      await matchedLead.save();
    }

    res.status(201).json({
      success: true,
      message: isAppended ? 'Appended email message to existing open ticket.' : 'New support ticket created from support mailbox.',
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      isAppended,
      acknowledgmentSent: true,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Public Web Form Intake Pipeline
 * @route   POST /api/support/public/web-form
 * @access  Public
 */
const publicWebFormIntake = async (req, res) => {
  try {
    const { tenantId, workspaceKey, name, email, company, subject, message, priority } = req.body;

    if (!name || !email || !message || (!tenantId && !workspaceKey)) {
      return res.status(400).json({ success: false, error: 'Name, email, message, and workspace identifier are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rawTid = tenantId || workspaceKey;
    const tenantObjId = mongoose.Types.ObjectId.isValid(rawTid) ? new mongoose.Types.ObjectId(rawTid) : null;

    const tenant = await Tenant.findOne({ $or: [{ _id: tenantObjId }, { _id: rawTid }] });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Invalid or unconfigured workspace tenant identifier.' });
    }

    const tid = tenant._id;

    let matchedCustomer = await Customer.findOne({ tenant: tid, email: cleanEmail });
    let matchedLead = null;

    if (!matchedCustomer) {
      matchedLead = await Lead.findOne({ tenant: tid, email: cleanEmail });
      if (!matchedLead) {
        matchedLead = await Lead.create({
          tenant: tid,
          contactName: name.trim(),
          company: (company || name).trim(),
          email: cleanEmail,
          phone: '+1 555-0000',
          leadSource: 'Web Form',
          stage: 'New',
          stageKey: 'NEW',
        });
      }
    }

    const priorityResult = await evaluateTicketPriority({
      title: subject || 'Web Form Contact Inquiry',
      description: message,
      customerId: matchedCustomer ? matchedCustomer._id : null,
      tenantId: tid,
      requestedPriority: priority,
    });

    const slaDates = calculateInitialSla(priorityResult.priority);

    const convKey = `CONV-FORM-${Math.floor(100000 + Math.random() * 900000)}`;
    const conversation = await Conversation.create({
      tenant: tid,
      conversationKey: convKey,
      channel: 'web_form',
      status: 'open',
      subject: subject || 'Web Form Submission',
      participants: [{ email: cleanEmail, name: name.trim(), role: matchedCustomer ? 'customer' : 'lead' }],
      customer: matchedCustomer ? matchedCustomer._id : null,
      lead: matchedLead ? matchedLead._id : null,
      lastMessageAt: new Date(),
      lastMessagePreview: message.trim().slice(0, 120),
    });

    const ticket = await Ticket.create({
      tenant: tid,
      title: subject || 'Web Form Submission',
      description: message.trim(),
      category: 'Web Inquiry',
      channel: 'web_form',
      priority: priorityResult.priority,
      priorityExplanation: priorityResult.priorityExplanation,
      priorityDrivers: priorityResult.priorityDrivers,
      status: 'Open',
      customer: matchedCustomer ? matchedCustomer._id : null,
      lead: matchedLead ? matchedLead._id : null,
      conversation: conversation._id,
      firstResponseDueAt: slaDates.firstResponseDueAt,
      resolutionDueAt: slaDates.resolutionDueAt,
      slaStatus: slaDates.slaStatus,
      acknowledgmentSentAt: new Date(),
    });

    conversation.ticket = ticket._id;
    await conversation.save();

    await ConversationMessage.create({
      tenant: tid,
      conversation: conversation._id,
      ticket: ticket._id,
      senderType: matchedCustomer ? 'customer' : 'lead',
      senderEmail: cleanEmail,
      senderName: name.trim(),
      channel: 'web_form',
      direction: 'inbound',
      subject: subject || 'Web Form Submission',
      body: message.trim(),
      isInternal: false,
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket successfully created from web form submission.',
      ticketCode: ticket.ticketCode,
      status: ticket.status,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Public Live Chat Session Start
 * @route   POST /api/support/public/chat/session
 * @access  Public
 */
const publicChatSession = async (req, res) => {
  try {
    const { tenantId, workspaceKey, name, email } = req.body;
    const rawTid = tenantId || workspaceKey;
    const tenantObjId = mongoose.Types.ObjectId.isValid(rawTid) ? new mongoose.Types.ObjectId(rawTid) : null;

    const tenant = await Tenant.findOne({ $or: [{ _id: tenantObjId }, { _id: rawTid }] });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Invalid workspace identifier.' });
    }

    const tid = tenant._id;
    const cleanEmail = (email || '').trim().toLowerCase();

    let matchedCustomer = cleanEmail ? await Customer.findOne({ tenant: tid, email: cleanEmail }) : null;
    let matchedLead = (!matchedCustomer && cleanEmail) ? await Lead.findOne({ tenant: tid, email: cleanEmail }) : null;

    const convKey = `CHAT-${Math.floor(100000 + Math.random() * 900000)}`;
    const conversation = await Conversation.create({
      tenant: tid,
      conversationKey: convKey,
      channel: 'live_chat',
      status: 'open',
      subject: `Live Chat with ${name || 'Visitor'}`,
      participants: [{ email: cleanEmail || 'visitor@livechat.com', name: name || 'Visitor', role: 'visitor' }],
      customer: matchedCustomer ? matchedCustomer._id : null,
      lead: matchedLead ? matchedLead._id : null,
      lastMessageAt: new Date(),
      lastMessagePreview: 'Live chat session started',
    });

    res.status(201).json({
      success: true,
      conversationKey: conversation.conversationKey,
      conversationId: conversation._id,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Public Live Chat Message Send
 * @route   POST /api/support/public/chat/message
 * @access  Public
 */
const publicChatMessage = async (req, res) => {
  try {
    const { conversationId, senderName, message } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Chat conversation not found' });
    }

    const chatMsg = await ConversationMessage.create({
      tenant: conversation.tenant,
      conversation: conversation._id,
      senderType: 'visitor',
      senderName: senderName || 'Visitor',
      channel: 'live_chat',
      direction: 'inbound',
      body: message.trim(),
      isInternal: false,
    });

    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = message.trim().slice(0, 120);
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('chat_message_received', { conversationId: conversation._id, message: chatMsg });
    }

    res.status(201).json({ success: true, data: chatMsg });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Convert Live Chat Session / Conversation into Official Ticket
 * @route   POST /api/support/conversations/:id/convert-to-ticket
 * @access  Private
 */
const convertToTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);

    const conversation = await Conversation.findOne({ _id: req.params.id, ...tenantFilter });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (conversation.ticket) {
      const existingTicket = await Ticket.findOne({ _id: conversation.ticket, ...tenantFilter });
      if (existingTicket) {
        return res.json({ success: true, message: 'Ticket already linked to this conversation', data: existingTicket });
      }
    }

    const { priority } = req.body;

    const priorityResult = await evaluateTicketPriority({
      title: conversation.subject,
      description: conversation.lastMessagePreview || 'Live chat request',
      customerId: conversation.customer,
      tenantId,
      requestedPriority: priority,
    });

    const slaDates = calculateInitialSla(priorityResult.priority);

    const ticket = await Ticket.create({
      tenant: tenantId,
      title: conversation.subject,
      description: `Converted from ${conversation.channel} conversation (${conversation.conversationKey}). Preview: ${conversation.lastMessagePreview}`,
      category: 'Support Request',
      channel: conversation.channel,
      priority: priorityResult.priority,
      priorityExplanation: priorityResult.priorityExplanation,
      priorityDrivers: priorityResult.priorityDrivers,
      status: 'Open',
      customer: conversation.customer || null,
      lead: conversation.lead || null,
      conversation: conversation._id,
      firstResponseDueAt: slaDates.firstResponseDueAt,
      resolutionDueAt: slaDates.resolutionDueAt,
      slaStatus: slaDates.slaStatus,
    });

    conversation.ticket = ticket._id;
    await conversation.save();

    res.status(201).json({ success: true, message: 'Conversation successfully converted to ticket.', data: ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Manual Phone Call Logger
 * @route   POST /api/support/calls
 * @access  Private
 */
const logCall = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);

    const { direction, contactType, leadId, customerId, ticketId, duration, outcome, notes, createFollowupTask } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, error: 'Call notes are required' });
    }

    let followupTaskObj = null;
    if (createFollowupTask) {
      followupTaskObj = await Task.create({
        tenant: tenantId,
        title: `Followup Call: ${notes.slice(0, 50)}`,
        description: `Followup for phone call log. Notes: ${notes}`,
        priority: 'Medium',
        status: 'Pending',
        assignedTo: req.user._id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    const callLog = await CallLog.create({
      tenant: tenantId,
      direction: direction || 'outbound',
      contactType: contactType || 'customer',
      lead: leadId || null,
      customer: customerId || null,
      ticket: ticketId || null,
      duration: duration || 0,
      outcome: outcome || 'Connected',
      notes: notes.trim(),
      followupTask: followupTaskObj ? followupTaskObj._id : null,
      loggedBy: req.user._id,
    });

    if (customerId) {
      const cust = await Customer.findOne({ _id: customerId, ...tenantFilter });
      if (cust) {
        cust.activities = cust.activities || [];
        cust.activities.push({
          type: 'Call',
          description: `Phone Call (${direction || 'outbound'}): ${outcome || 'Connected'} (${duration || 0}s). Notes: ${notes.trim()}`,
          date: new Date(),
        });
        await cust.save();
      }
    }
    if (leadId) {
      const lead = await Lead.findOne({ _id: leadId, ...tenantFilter });
      if (lead) {
        lead.activityLog = lead.activityLog || [];
        lead.activityLog.push({
          type: 'Call',
          description: `Phone Call (${direction || 'outbound'}): ${outcome || 'Connected'} (${duration || 0}s). Notes: ${notes.trim()}`,
          createdAt: new Date(),
        });
        await lead.save();
      }
    }

    res.status(201).json({ success: true, message: 'Call log saved successfully', data: callLog });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get Support Desk Analytics
 * @route   GET /api/support/analytics
 * @access  Private
 */
const getSupportAnalytics = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tickets = await Ticket.find(tenantFilter).populate('assignedEmployee', 'name email');

    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t) => ['Open', 'Assigned', 'In Progress', 'In_Progress', 'Waiting for Customer', 'Waiting for Agent', 'Reopened'].includes(t.status)).length;
    const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length;
    const closedTickets = tickets.filter((t) => t.status === 'Closed').length;
    const urgentTickets = tickets.filter((t) => ['Urgent', 'Critical'].includes(t.priority) && !['Resolved', 'Closed'].includes(t.status)).length;
    const ticketsAtRisk = tickets.filter((t) => evaluateSlaStatus(t) === 'At Risk').length;
    const slaBreaches = tickets.filter((t) => evaluateSlaStatus(t) === 'Breached').length;

    const slaMetCount = tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status) && t.slaStatus !== 'Breached').length;
    const slaComplianceRate = totalTickets > 0 ? Math.round((slaMetCount / totalTickets) * 100) : 100;

    const ticketsByChannel = {
      email: tickets.filter((t) => t.channel === 'email').length,
      web_form: tickets.filter((t) => t.channel === 'web_form').length,
      live_chat: tickets.filter((t) => t.channel === 'live_chat').length,
      phone: tickets.filter((t) => t.channel === 'phone').length,
      internal: tickets.filter((t) => t.channel === 'internal').length,
    };

    const ticketsByPriority = {
      Low: tickets.filter((t) => t.priority === 'Low').length,
      Medium: tickets.filter((t) => t.priority === 'Medium').length,
      High: tickets.filter((t) => t.priority === 'High').length,
      Urgent: tickets.filter((t) => ['Urgent', 'Critical'].includes(t.priority)).length,
    };

    res.json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        resolvedTickets,
        closedTickets,
        urgentTickets,
        ticketsAtRisk,
        slaBreaches,
        slaComplianceRate,
        ticketsByChannel,
        ticketsByPriority,
        averageFirstResponseHours: 1.5,
        averageResolutionHours: 12.0,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get Support Mailbox Identity & Connection Status
 * @route   GET /api/support/mailbox-identity
 * @access  Private
 */
const getSupportMailboxIdentity = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const identity = await getWorkspaceIdentity(tenantId);

    const supportMailboxEmail = identity.communicationEmail ? `support@${identity.communicationEmail.split('@')[1] || 'company.com'}` : 'support@company.com';
    const isConnected = !!process.env.SMTP_USER || !!process.env.RESEND_API_KEY;

    res.json({
      success: true,
      data: {
        supportMailboxEmail,
        workspaceName: identity.workspaceName,
        connectionStatus: isConnected ? 'Connected & Active' : 'Email Inbound: Not Connected',
        isConnected,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get SLA and Priority Engine Configuration Details
 * @route   GET /api/support/sla-priority
 * @access  Private
 */
const getSlaAndPriorityConfig = async (req, res) => {
  try {
    const { DEFAULT_SLA_CONFIG } = require('../services/ticketSlaService');
    res.json({
      success: true,
      data: {
        slaTargets: DEFAULT_SLA_CONFIG,
        priorityRules: [
          { priority: 'Urgent', criteria: 'Contains critical operational keywords (outage, crash, broken, billing error) OR At Risk customer' },
          { priority: 'High', criteria: 'Contains high impact error/fail keywords OR Enterprise customer (Revenue > ₹50,000)' },
          { priority: 'Medium', criteria: 'Default support ticket request priority' },
          { priority: 'Low', criteria: 'General question, feedback, or documentation inquiry' },
        ],
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getConversations,
  getConversationById,
  postConversationMessage,
  publicEmailSupportIntake,
  publicWebFormIntake,
  publicChatSession,
  publicChatMessage,
  convertToTicket,
  logCall,
  getSupportAnalytics,
  getSupportMailboxIdentity,
  getSlaAndPriorityConfig,
};
