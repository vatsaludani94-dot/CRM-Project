const Ticket = require('../models/Ticket');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const ConversationMessage = require('../models/ConversationMessage');
const AIService = require('../services/aiService');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');
const { evaluateTicketPriority } = require('../services/ticketPriorityService');
const { calculateInitialSla, evaluateSlaStatus } = require('../services/ticketSlaService');

/**
 * @desc    Get all tickets
 * @route   GET /api/tickets
 * @access  Private
 */
const getTickets = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    let query = { ...tenantFilter };

    // RBAC: Customers see only their tickets. Employees see all or assigned.
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email, ...tenantFilter });
      if (customer) {
        query.customer = customer._id;
      } else {
        return res.json({ success: true, count: 0, data: [] });
      }
    } else if (req.user.role === 'employee') {
      if (req.query.assignedOnly === 'true') {
        query.assignedEmployee = req.user._id;
      }
    }

    // Filter by status/priority/channel
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.channel) query.channel = req.query.channel;

    const tickets = await Ticket.find(query)
      .populate('customer', 'companyName contactPerson email customerCode')
      .populate('lead', 'contactName company email phone stage')
      .populate('assignedEmployee', 'name email role department')
      .populate('conversation', 'conversationKey channel status')
      .sort({ updatedAt: -1 });

    // Evaluate dynamic SLA status for active tickets
    const evaluatedTickets = tickets.map((t) => {
      const doc = t.toObject();
      doc.slaStatus = evaluateSlaStatus(t);
      return doc;
    });

    res.json({ success: true, count: evaluatedTickets.length, data: evaluatedTickets });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
const getTicketById = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('customer', 'companyName contactPerson email phone customerCode status revenueGenerated')
      .populate('lead', 'contactName company email phone stage')
      .populate('assignedEmployee', 'name email role department')
      .populate('resolvedBy', 'name email role')
      .populate('comments.commentedBy', 'name email role')
      .populate('conversation');

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // RBAC check
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email, ...tenantFilter });
      if (!customer || (ticket.customer && ticket.customer._id.toString() !== customer._id.toString())) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this ticket' });
      }
      // Hide internal notes from customer role
      ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    }

    const doc = ticket.toObject();
    doc.slaStatus = evaluateSlaStatus(ticket);

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create support ticket
 * @route   POST /api/tickets
 * @access  Private
 */
const createTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { title, description, category, priority, customerId, leadId, channel, assignedEmployee, attachments } = req.body;
    let targetCustomerId = customerId;
    let targetLeadId = leadId;

    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email, ...tenantFilter });
      if (!customer) {
        return res.status(400).json({ success: false, error: 'No associated customer profile found for this account' });
      }
      targetCustomerId = customer._id;
    }

    // Validate Customer belongs to workspace if provided
    let targetCustomer = null;
    if (targetCustomerId) {
      targetCustomer = await Customer.findOne({ _id: targetCustomerId, ...tenantFilter });
      if (!targetCustomer) {
        return res.status(400).json({ success: false, error: 'Customer does not belong to your workspace' });
      }
    }

    // Validate Lead belongs to workspace if provided
    let targetLead = null;
    if (targetLeadId) {
      targetLead = await Lead.findOne({ _id: targetLeadId, ...tenantFilter });
      if (!targetLead) {
        return res.status(400).json({ success: false, error: 'Lead does not belong to your workspace' });
      }
    }

    if (!targetCustomerId && !targetLeadId && req.user.role !== 'admin' && req.user.role !== 'workspace_owner' && req.user.role !== 'manager' && req.user.role !== 'employee') {
      return res.status(400).json({ success: false, error: 'Customer ID or Lead ID is required' });
    }

    // Validate assignedEmployee belongs to workspace
    if (assignedEmployee) {
      const emp = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    // 1. Evaluate Priority via Priority Engine
    const priorityResult = await evaluateTicketPriority({
      title,
      description,
      customerId: targetCustomerId,
      tenantId,
      requestedPriority: priority,
    });

    // 2. Calculate SLA Due Dates
    const slaDates = calculateInitialSla(priorityResult.priority);

    // 3. Create Conversation
    const convKey = `CONV-${Math.floor(100000 + Math.random() * 900000)}`;
    const conversation = await Conversation.create({
      tenant: tenantId,
      conversationKey: convKey,
      channel: channel || 'email',
      status: 'open',
      subject: title,
      customer: targetCustomerId || null,
      lead: targetLeadId || null,
      assignedTo: assignedEmployee || null,
      lastMessageAt: new Date(),
      lastMessagePreview: description.slice(0, 120),
    });

    const ticket = new Ticket({
      title,
      description,
      channel: channel || 'email',
      customer: targetCustomerId || null,
      lead: targetLeadId || null,
      conversation: conversation._id,
      assignedEmployee: assignedEmployee || null,
      priority: priorityResult.priority,
      priorityExplanation: priorityResult.priorityExplanation,
      priorityDrivers: priorityResult.priorityDrivers,
      firstResponseDueAt: slaDates.firstResponseDueAt,
      resolutionDueAt: slaDates.resolutionDueAt,
      slaStatus: slaDates.slaStatus,
      attachments: attachments || [],
      tenant: tenantId,
    });

    if (!category) {
      ticket.category = await AIService.classifyTicket(title, description);
    } else {
      ticket.category = category;
    }

    ticket.status = assignedEmployee ? 'Assigned' : 'Open';

    await ticket.save();

    conversation.ticket = ticket._id;
    await conversation.save();

    // Create initial message in ConversationMessage
    await ConversationMessage.create({
      tenant: tenantId,
      conversation: conversation._id,
      ticket: ticket._id,
      senderType: req.user.role === 'customer' ? 'customer' : 'agent',
      senderUser: req.user._id,
      senderEmail: req.user.email,
      senderName: req.user.name,
      channel: channel || 'email',
      direction: req.user.role === 'customer' ? 'inbound' : 'outbound',
      subject: title,
      body: description,
      attachments: attachments || [],
      isInternal: false,
    });

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'lead', select: 'contactName company email phone stage' },
      { path: 'assignedEmployee', select: 'name email role department' },
      { path: 'conversation' },
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_created', ticket);
      io.emit('conversation_updated', conversation);
    }

    await Activity.create({
      user: req.user._id,
      action: 'Ticket Created',
      details: `Ticket ${ticket.ticketCode} ("${ticket.title}") created via ${ticket.channel}. Priority: ${ticket.priority} (${ticket.priorityExplanation})`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: tenantId,
    });

    if (targetCustomer) {
      targetCustomer.activities = targetCustomer.activities || [];
      targetCustomer.activities.push({
        type: 'System',
        description: `Support Ticket ${ticket.ticketCode} created ("${ticket.title}"). Priority: ${ticket.priority}`,
        date: new Date(),
      });
      await targetCustomer.save();
    }
    if (targetLead) {
      targetLead.activityLog = targetLead.activityLog || [];
      targetLead.activityLog.push({
        type: 'System',
        description: `Support Ticket ${ticket.ticketCode} created ("${ticket.title}"). Priority: ${ticket.priority}`,
        createdAt: new Date(),
      });
      await targetLead.save();
    }

    if (assignedEmployee) {
      const notification = await Notification.create({
        recipient: assignedEmployee,
        sender: req.user._id,
        title: 'New Ticket Assigned',
        message: `Support Ticket ${ticket.ticketCode} ("${ticket.title}") was assigned to you.`,
        type: 'Ticket',
        link: `/tickets`,
        tenant: tenantId,
      });

      if (io) {
        io.to(assignedEmployee.toString()).emit('notification_received', notification);
      }
    }

    try {
      if (targetCustomerId) {
        const { calculateCustomerHealth } = require('../services/customerHealthService');
        await calculateCustomerHealth(targetCustomerId, tenantId);
      }
      const { triggerWorkflowEvents } = require('./workflowController');
      await triggerWorkflowEvents('ticket.created', 'Ticket', ticket._id, tenantId);
      if (ticket.priority === 'Urgent') {
        await triggerWorkflowEvents('ticket.urgent_created', 'Ticket', ticket._id, tenantId);
      }
    } catch (hErr) {}

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Ticket creation error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update ticket status/priority with controlled transitions
 * @route   PUT /api/tickets/:id
 * @access  Private (Admin, Manager, Employee)
 */
const updateTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { status, priority, assignedEmployee, category, resolutionSummary } = req.body;
    let statusChanged = false;
    let priorityChanged = false;
    let assignmentChanged = false;
    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;

    if (assignedEmployee !== undefined) {
      if (assignedEmployee) {
        const emp = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
        if (!emp) {
          return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
        }
      }
      if (String(ticket.assignedEmployee) !== String(assignedEmployee)) {
        ticket.assignedEmployee = assignedEmployee || null;
        assignmentChanged = true;
        if (assignedEmployee && ticket.status === 'Open') {
          ticket.status = 'Assigned';
          statusChanged = true;
        }
      }
    }

    if (category) ticket.category = category;
    if (resolutionSummary) ticket.resolutionSummary = resolutionSummary;

    // Manual Priority Override
    if (priority && priority !== ticket.priority) {
      ticket.priority = priority;
      ticket.priorityExplanation = `Priority manually updated to ${priority} by ${req.user.name}.`;
      ticket.priorityDrivers = [`Manual override by ${req.user.name}`];
      priorityChanged = true;
    }

    // Controlled Status Transition Validation
    if (status && ticket.status !== status) {
      const normalizedStatus = status === 'In_Progress' ? 'In Progress' : status;
      const normalizedOld = ticket.status === 'In_Progress' ? 'In Progress' : ticket.status;

      const validTransitions = {
        'Open': ['Assigned', 'In Progress', 'In_Progress', 'Waiting for Customer', 'Waiting for Agent', 'Resolved', 'Closed'],
        'Assigned': ['Open', 'In Progress', 'In_Progress', 'Waiting for Customer', 'Waiting for Agent', 'Resolved', 'Closed'],
        'In Progress': ['Waiting for Customer', 'Waiting for Agent', 'Resolved', 'Open', 'Closed'],
        'In_Progress': ['Waiting for Customer', 'Waiting for Agent', 'Resolved', 'Open', 'Closed'],
        'Waiting for Customer': ['In Progress', 'In_Progress', 'Waiting for Agent', 'Resolved', 'Closed'],
        'Waiting for Agent': ['In Progress', 'In_Progress', 'Waiting for Customer', 'Resolved', 'Closed'],
        'Resolved': ['Closed', 'In Progress', 'In_Progress', 'Open', 'Reopened'],
        'Closed': ['Reopened', 'In Progress', 'In_Progress', 'Open'],
        'Reopened': ['In Progress', 'In_Progress', 'Assigned', 'Resolved', 'Closed'],
      };

      const allowed = validTransitions[normalizedOld] || [];
      if (!allowed.includes(normalizedStatus) && !allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid ticket status transition from "${ticket.status}" to "${status}"`,
        });
      }

      ticket.status = normalizedStatus;
      statusChanged = true;

      if (['Resolved', 'Closed'].includes(normalizedStatus)) {
        ticket.resolvedAt = ticket.resolvedAt || new Date();
        ticket.resolvedBy = req.user._id;
        if (ticket.createdAt) {
          ticket.resolutionDurationMinutes = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
        }
      }

      if (normalizedStatus === 'Reopened') {
        ticket.reopenedAt = new Date();
        ticket.reopenCount = (ticket.reopenCount || 0) + 1;
      }
    }

    ticket.slaStatus = evaluateSlaStatus(ticket);
    await ticket.save();

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'lead', select: 'contactName company email phone stage' },
      { path: 'assignedEmployee', select: 'name email role department' },
      { path: 'resolvedBy', select: 'name email role' },
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_updated', ticket);
    }

    await Activity.create({
      user: req.user._id,
      action: 'Ticket Updated',
      details: `Ticket ${ticket.ticketCode} updated. Status: ${oldStatus} -> ${ticket.status}. Priority: ${oldPriority} -> ${ticket.priority} by ${req.user.name}.`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: ticket.tenant,
    });

    try {
      const customerId = ticket.customer?._id || ticket.customer;
      if (customerId) {
        const { calculateCustomerHealth } = require('../services/customerHealthService');
        await calculateCustomerHealth(customerId, ticket.tenant);
      }
      const { triggerWorkflowEvents } = require('./workflowController');
      if (statusChanged) {
        await triggerWorkflowEvents('ticket.status_changed', 'Ticket', ticket._id, ticket.tenant);
        if (['Resolved', 'Closed'].includes(ticket.status)) {
          await triggerWorkflowEvents('ticket.resolved', 'Ticket', ticket._id, ticket.tenant);
        }
      }
      if (priorityChanged) {
        await triggerWorkflowEvents('ticket.priority_changed', 'Ticket', ticket._id, ticket.tenant);
      }
    } catch (hErr) {}

    if (assignmentChanged && assignedEmployee) {
      const notification = await Notification.create({
        recipient: assignedEmployee,
        sender: req.user._id,
        title: 'Ticket Assigned',
        message: `Ticket ${ticket.ticketCode} ("${ticket.title}") has been assigned to you.`,
        type: 'Ticket',
        link: `/tickets`,
        tenant: ticket.tenant,
      });

      if (io) {
        io.to(assignedEmployee.toString()).emit('notification_received', notification);
      }
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Manual Ticket Agent Assignment
 * @route   PUT /api/tickets/:id/assign
 * @access  Private (Admin, Manager, Employee)
 */
const assignTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { assignedEmployee } = req.body;
    let targetEmployee = null;

    if (assignedEmployee) {
      targetEmployee = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
      if (!targetEmployee) {
        return res.status(400).json({ success: false, error: 'Target employee does not belong to your workspace' });
      }
    }

    ticket.assignedEmployee = targetEmployee ? targetEmployee._id : null;
    if (targetEmployee && ['Open', 'Waiting for Agent'].includes(ticket.status)) {
      ticket.status = 'Assigned';
    }

    ticket.slaStatus = evaluateSlaStatus(ticket);
    await ticket.save();

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'lead', select: 'contactName company email phone stage' },
      { path: 'assignedEmployee', select: 'name email role department' },
    ]);

    await Activity.create({
      user: req.user._id,
      action: 'Ticket Assigned',
      details: `Ticket ${ticket.ticketCode} assigned to ${targetEmployee ? targetEmployee.name : 'Unassigned'} by ${req.user.name}`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: ticket.tenant,
    });

    res.json({ success: true, message: `Ticket successfully assigned to ${targetEmployee ? targetEmployee.name : 'Unassigned'}`, data: ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Resolve Support Ticket with required Resolution Summary
 * @route   PUT /api/tickets/:id/resolve
 * @access  Private (Admin, Manager, Employee)
 */
const resolveTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { resolutionSummary } = req.body;
    if (!resolutionSummary || !resolutionSummary.trim()) {
      return res.status(400).json({ success: false, error: 'Resolution summary is required to resolve a ticket.' });
    }

    ticket.status = 'Resolved';
    ticket.resolutionSummary = resolutionSummary.trim();
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = req.user._id;
    if (ticket.createdAt) {
      ticket.resolutionDurationMinutes = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
    }

    ticket.slaStatus = evaluateSlaStatus(ticket);
    await ticket.save();

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'lead', select: 'contactName company email phone stage' },
      { path: 'assignedEmployee', select: 'name email role department' },
      { path: 'resolvedBy', select: 'name email role' },
    ]);

    // Record activity on Customer 360 or Lead timeline
    if (ticket.customer) {
      const cust = await Customer.findOne({ _id: ticket.customer, ...tenantFilter });
      if (cust) {
        cust.activities = cust.activities || [];
        cust.activities.push({
          type: 'Ticket Resolved',
          description: `Ticket ${ticket.ticketCode} resolved. Summary: ${ticket.resolutionSummary}`,
          date: new Date(),
        });
        await cust.save();
      }
    }

    try {
      const customerId = ticket.customer?._id || ticket.customer;
      if (customerId) {
        const { calculateCustomerHealth } = require('../services/customerHealthService');
        await calculateCustomerHealth(customerId, ticket.tenant);
      }
      const { triggerWorkflowEvents } = require('./workflowController');
      await triggerWorkflowEvents('ticket.resolved', 'Ticket', ticket._id, ticket.tenant);
    } catch (hErr) {}

    res.json({ success: true, message: 'Ticket resolved successfully.', data: ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Reopen closed or resolved ticket
 * @route   PUT /api/tickets/:id/reopen
 * @access  Private
 */
const reopenTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    ticket.status = 'Reopened';
    ticket.reopenedAt = new Date();
    ticket.reopenCount = (ticket.reopenCount || 0) + 1;

    ticket.slaStatus = evaluateSlaStatus(ticket);
    await ticket.save();

    res.json({ success: true, message: 'Ticket reopened successfully.', data: ticket });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Add comment / reply to ticket (Supports Customer Reply vs Internal Note & Attachments)
 * @route   POST /api/tickets/:id/comments
 * @access  Private
 */
const addTicketComment = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { comment, isInternal, attachments } = req.body;
    if (!comment && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, error: 'Comment content or attachment is required' });
    }

    // Validate attachments if provided
    if (attachments && Array.isArray(attachments)) {
      const forbiddenExts = ['.exe', '.bat', '.sh', '.dll', '.cmd', '.ps1', '.vbs', '.msi'];
      for (const att of attachments) {
        const ext = (att.fileName || '').slice((att.fileName || '').lastIndexOf('.')).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          return res.status(400).json({ success: false, error: `Attachment "${att.fileName}" has a forbidden executable file format.` });
        }
      }
    }

    const internalFlag = isInternal === true || isInternal === 'true';

    const newComment = {
      comment: comment || 'Attachment file uploaded',
      commentedBy: req.user._id,
      isInternal: internalFlag,
      attachments: attachments || [],
      createdAt: new Date(),
    };

    ticket.comments.push(newComment);

    // If ticket was Closed or Resolved and customer posts new message, auto-reopen!
    if (req.user.role === 'customer' && ['Closed', 'Resolved'].includes(ticket.status)) {
      ticket.status = 'Reopened';
      ticket.reopenedAt = new Date();
      ticket.reopenCount = (ticket.reopenCount || 0) + 1;
    }

    // If agent posts customer-visible reply for the first time, record firstRespondedAt
    if (!internalFlag && req.user.role !== 'customer' && !ticket.firstRespondedAt) {
      ticket.firstRespondedAt = new Date();
    }

    ticket.slaStatus = evaluateSlaStatus(ticket);
    await ticket.save();

    // Sync to Conversation & ConversationMessage
    if (ticket.conversation) {
      const conv = await Conversation.findOne({ _id: ticket.conversation, ...tenantFilter });
      if (conv) {
        conv.lastMessageAt = new Date();
        conv.lastMessagePreview = (comment || 'Attachment').slice(0, 120);
        await conv.save();

        await ConversationMessage.create({
          tenant: ticket.tenant,
          conversation: conv._id,
          ticket: ticket._id,
          senderType: req.user.role === 'customer' ? 'customer' : 'agent',
          senderUser: req.user._id,
          senderEmail: req.user.email,
          senderName: req.user.name,
          channel: ticket.channel || 'email',
          direction: internalFlag ? 'internal' : (req.user.role === 'customer' ? 'inbound' : 'outbound'),
          subject: `Re: ${ticket.title}`,
          body: comment || 'Attachment uploaded',
          attachments: attachments || [],
          isInternal: internalFlag,
        });
      }
    }

    const updatedTicket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('comments.commentedBy', 'name email role profilePicture')
      .populate('customer', 'companyName contactPerson email customerCode')
      .populate('lead', 'contactName company email phone stage')
      .populate('assignedEmployee', 'name email role department');

    const addedComment = updatedTicket.comments[updatedTicket.comments.length - 1];

    const io = req.app.get('io');
    if (io) {
      io.emit('comment_added', {
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        comment: addedComment,
      });
    }

    await Activity.create({
      user: req.user._id,
      action: internalFlag ? 'Ticket Internal Note Added' : 'Ticket Customer Reply Added',
      details: `${internalFlag ? 'Internal note' : 'Customer reply'} added to Ticket ${ticket.ticketCode} by ${req.user.name}.`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: ticket.tenant,
    });

    res.status(201).json({ success: true, data: addedComment });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    AI Support Clarification Flow (Structured Question Gathering & Evidence Collection)
 * @route   POST /api/tickets/:id/ai-clarify
 * @access  Private (or System Inbound)
 */
const aiClarifyTicket = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { customerResponse, step } = req.body;

    ticket.aiClarification = ticket.aiClarification || {};
    ticket.aiClarification.active = true;

    let aiQuestion = '';
    let isFinalSummary = false;

    // Structured 5-step disclosure-friendly question sequence
    if (!step || step === 1) {
      aiQuestion = `Hello! I am the GrownX AI Support Assistant. To help your assigned support agent resolve this quickly, could you briefly describe what specific problem you are facing?`;
      ticket.aiClarification.questionsGathered.push('Issue area inquiry');
    } else if (step === 2) {
      aiQuestion = `Thank you. Did this issue start occurring after a recent software update, password reset, or configuration change?`;
      ticket.aiClarification.recentChangeDetails = customerResponse || 'No recent change specified';
      ticket.aiClarification.questionsGathered.push('Recent changes inquiry');
    } else if (step === 3) {
      aiQuestion = `Got it. Can you please attach or provide a link to a screenshot, error log, or affected PDF document?`;
      ticket.aiClarification.questionsGathered.push('Evidence / Screenshot request');
    } else if (step === 4) {
      aiQuestion = `Does this issue affect one specific record or multiple items across your account? Is this currently blocking your critical work?`;
      ticket.aiClarification.affectedItems = customerResponse || 'Single item';
      ticket.aiClarification.questionsGathered.push('Urgency and scope check');
    } else {
      isFinalSummary = true;
      ticket.aiClarification.issueSummary = `Structured Support Clarification Summary:
- Customer Problem: ${ticket.title}
- Scope & Affected Items: ${ticket.aiClarification.affectedItems || 'Single'}
- Recent Change Context: ${ticket.aiClarification.recentChangeDetails || 'None'}
- Urgency: ${ticket.priority}`;
      aiQuestion = `Thank you for providing these details! I have summarized your responses and attached them to your ticket. An assigned customer care agent will review this evidence and get in touch with you shortly.`;
      ticket.status = 'Waiting for Agent';
    }

    await ticket.save();

    // Sync AI Question to Conversation Stream
    if (ticket.conversation) {
      const conv = await Conversation.findOne({ _id: ticket.conversation, tenant: ticket.tenant });
      if (conv) {
        await ConversationMessage.create({
          tenant: ticket.tenant,
          conversation: conv._id,
          ticket: ticket._id,
          senderType: 'ai_assistant',
          senderName: 'GrownX AI Support Assistant',
          channel: ticket.channel || 'email',
          direction: 'outbound',
          subject: `Support Clarification Question (Step ${step || 1})`,
          body: aiQuestion,
          isInternal: false,
        });
      }
    }

    res.json({
      success: true,
      data: {
        aiQuestion,
        step: step || 1,
        isFinalSummary,
        issueSummary: ticket.aiClarification.issueSummary,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get AI Reply Suggestions for ticket
 * @route   GET /api/tickets/:id/ai-suggestions
 * @access  Private (Admin, Manager, Employee)
 */
const getTicketAISuggestions = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const ticket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter }).populate('customer', 'contactPerson companyName');
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const customerName = ticket.customer ? ticket.customer.contactPerson : 'Customer';
    const suggestions = await AIService.suggestReplies(
      ticket.title,
      ticket.description,
      ticket.category,
      customerName
    );

    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
  resolveTicket,
  reopenTicket,
  addTicketComment,
  aiClarifyTicket,
  getTicketAISuggestions,
};
