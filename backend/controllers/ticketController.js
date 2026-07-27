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
    const { title, description, category, priority, customerId, leadId, channel, assignedEmployee } = req.body;
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

    // 1. Evaluate Priority via Priority & Criticality Engine
    const priorityResult = await evaluateTicketPriority({
      title,
      description,
      customerId: targetCustomerId,
      tenantId,
      requestedPriority: priority,
    });

    // 2. Calculate SLA Due Dates
    const slaDates = calculateInitialSla(priorityResult.priority);

    // 3. Create or Link Conversation
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
      tenant: tenantId,
    });

    if (!category) {
      ticket.category = await AIService.classifyTicket(title, description);
    } else {
      ticket.category = category;
    }

    ticket.status = assignedEmployee ? 'Assigned' : 'Open';

    await ticket.save();

    // Link Ticket back to Conversation
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

    // Record activity on Customer 360 or Lead timeline
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

    // Recalculate Customer Health
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

    const { status, priority, assignedEmployee, category } = req.body;
    let statusChanged = false;
    let priorityChanged = false;
    let assignmentChanged = false;
    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;

    if (assignedEmployee) {
      const emp = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    if (category) ticket.category = category;

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
        'Open': ['Assigned', 'In Progress', 'In_Progress', 'Waiting for Customer', 'Closed'],
        'Assigned': ['Open', 'In Progress', 'In_Progress', 'Waiting for Customer', 'Closed'],
        'In Progress': ['Waiting for Customer', 'Resolved', 'Open', 'Closed'],
        'In_Progress': ['Waiting for Customer', 'Resolved', 'Open', 'Closed'],
        'Waiting for Customer': ['In Progress', 'In_Progress', 'Resolved', 'Closed'],
        'Resolved': ['Closed', 'In Progress', 'In_Progress', 'Open'],
        'Closed': ['In Progress', 'In_Progress', 'Open'],
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
      }
    }

    if (assignedEmployee !== undefined && String(ticket.assignedEmployee) !== String(assignedEmployee)) {
      ticket.assignedEmployee = assignedEmployee || null;
      assignmentChanged = true;
      if (assignedEmployee && ticket.status === 'Open') {
        ticket.status = 'Assigned';
        statusChanged = true;
      }
    }

    ticket.slaStatus = evaluateSlaStatus(ticket);
    await ticket.save();

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'lead', select: 'contactName company email phone stage' },
      { path: 'assignedEmployee', select: 'name email role department' },
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

    // Recalculate customer health & trigger workflows
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
 * @desc    Add comment / reply to ticket (Supports Customer Reply vs Internal Note)
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

    const { comment, isInternal } = req.body;
    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment content is required' });
    }

    const internalFlag = isInternal === true || isInternal === 'true';

    const newComment = {
      comment,
      commentedBy: req.user._id,
      isInternal: internalFlag,
      createdAt: new Date(),
    };

    ticket.comments.push(newComment);

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
        conv.lastMessagePreview = comment.slice(0, 120);
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
          body: comment,
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
  addTicketComment,
  getTicketAISuggestions,
};
