const Ticket = require('../models/Ticket');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AIService = require('../services/aiService');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

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

    // Filter by status/priority
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const tickets = await Ticket.find(query)
      .populate('customer', 'companyName contactPerson email customerCode')
      .populate('assignedEmployee', 'name email role department')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: tickets.length, data: tickets });
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
      .populate('customer', 'companyName contactPerson email phone customerCode status')
      .populate('assignedEmployee', 'name email role department')
      .populate('comments.commentedBy', 'name email role');

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // RBAC check
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email, ...tenantFilter });
      if (!customer || ticket.customer._id.toString() !== customer._id.toString()) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this ticket' });
      }
    }

    res.json({ success: true, data: ticket });
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
    const { title, description, category, priority, customerId, assignedEmployee } = req.body;
    let targetCustomerId = customerId;

    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email, ...tenantFilter });
      if (!customer) {
        return res.status(400).json({ success: false, error: 'No associated customer profile found for this account' });
      }
      targetCustomerId = customer._id;
    }

    if (!targetCustomerId) {
      return res.status(400).json({ success: false, error: 'Customer ID is required' });
    }

    // Validate Customer belongs to workspace
    const targetCustomer = await Customer.findOne({ _id: targetCustomerId, ...tenantFilter });
    if (!targetCustomer) {
      return res.status(400).json({ success: false, error: 'Customer does not belong to your workspace' });
    }

    // Validate assignedEmployee belongs to workspace
    if (assignedEmployee) {
      const emp = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    const ticket = new Ticket({
      title,
      description,
      customer: targetCustomerId,
      assignedEmployee,
      tenant: tenantId,
    });

    if (!category) {
      ticket.category = await AIService.classifyTicket(title, description);
    } else {
      ticket.category = category;
    }

    if (!priority) {
      ticket.priority = await AIService.detectPriority(title, description);
    } else {
      ticket.priority = priority;
    }

    ticket.status = assignedEmployee ? 'Assigned' : 'Open';

    await ticket.save();

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'assignedEmployee', select: 'name email role department' }
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_created', ticket);
    }

    await Activity.create({
      user: req.user._id,
      action: 'Ticket Created',
      details: `Ticket ${ticket.ticketCode} (${ticket.title}) created. AI Category: ${ticket.category}. AI Priority: ${ticket.priority}`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: tenantId,
    });

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

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Ticket creation error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update ticket status/priority
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
    let assignmentChanged = false;

    if (assignedEmployee) {
      const emp = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    if (category) ticket.category = category;
    if (priority) ticket.priority = priority;

    if (status && ticket.status !== status) {
      ticket.status = status;
      statusChanged = true;
    }

    if (assignedEmployee !== undefined && String(ticket.assignedEmployee) !== String(assignedEmployee)) {
      ticket.assignedEmployee = assignedEmployee || null;
      assignmentChanged = true;
      if (assignedEmployee && ticket.status === 'Open') {
        ticket.status = 'Assigned';
        statusChanged = true;
      }
    }

    await ticket.save();

    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'assignedEmployee', select: 'name email role department' }
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_updated', ticket);
    }

    await Activity.create({
      user: req.user._id,
      action: 'Ticket Updated',
      details: `Ticket ${ticket.ticketCode} status updated to ${ticket.status} by ${req.user.name}.`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: ticket.tenant,
    });

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
 * @desc    Add comment to ticket
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

    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment content is required' });
    }

    const newComment = {
      comment,
      commentedBy: req.user._id,
    };

    ticket.comments.push(newComment);
    await ticket.save();

    const updatedTicket = await Ticket.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('comments.commentedBy', 'name email role profilePicture')
      .populate('customer', 'companyName contactPerson email customerCode')
      .populate('assignedEmployee', 'name email role department');

    const addedComment = updatedTicket.comments[updatedTicket.comments.length - 1];

    const io = req.app.get('io');
    if (io) {
      io.emit('comment_added', {
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        comment: addedComment
      });
    }

    await Activity.create({
      user: req.user._id,
      action: 'Ticket Comment Added',
      details: `Comment added to Ticket ${ticket.ticketCode} by ${req.user.name}.`,
      module: 'Ticket',
      ipAddress: req.ip,
      tenant: ticket.tenant,
    });

    const recipientId = (req.user.role === 'customer') 
      ? ticket.assignedEmployee 
      : null;
    
    if (recipientId && String(recipientId) !== String(req.user._id)) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        title: 'New Ticket Comment',
        message: `${req.user.name} commented on Ticket ${ticket.ticketCode}.`,
        type: 'Ticket',
        link: `/tickets`,
        tenant: ticket.tenant,
      });

      if (io) {
        io.to(recipientId.toString()).emit('notification_received', notification);
      }
    }

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
