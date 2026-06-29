const Ticket = require('../models/Ticket');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AIService = require('../services/aiService');

/**
 * @desc    Get all tickets
 * @route   GET /api/tickets
 * @access  Private
 */
const getTickets = async (req, res) => {
  try {
    let query = {};

    // RBAC: Customers see only their tickets. Employees see all or assigned.
    if (req.user.role === 'customer') {
      // Find customer profiles linked to this user's email
      const customer = await Customer.findOne({ email: req.user.email });
      if (customer) {
        query.customer = customer._id;
      } else {
        return res.json({ success: true, count: 0, data: [] });
      }
    } else if (req.user.role === 'employee') {
      // Employees see either everything or only their assigned tickets. Let's let them filter.
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
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customer', 'companyName contactPerson email phone customerCode status')
      .populate('assignedEmployee', 'name email role department')
      .populate('comments.commentedBy', 'name email role');

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // RBAC check
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email });
      if (!customer || ticket.customer._id.toString() !== customer._id.toString()) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this ticket' });
      }
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create support ticket
 * @route   POST /api/tickets
 * @access  Private
 */
const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority, customerId, assignedEmployee } = req.body;
    let targetCustomerId = customerId;

    // RBAC: If role is customer, resolve their customer profile ID automatically
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ email: req.user.email });
      if (!customer) {
        return res.status(400).json({ success: false, error: 'No associated customer profile found for this account' });
      }
      targetCustomerId = customer._id;
    }

    if (!targetCustomerId) {
      return res.status(400).json({ success: false, error: 'Customer ID is required' });
    }

    const ticket = new Ticket({
      title,
      description,
      customer: targetCustomerId,
      assignedEmployee,
    });

    // AI Automation: Classify category & detect priority if not provided explicitly
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

    // Default status handling
    ticket.status = assignedEmployee ? 'Assigned' : 'Open';

    await ticket.save();

    // Populate references for socket payload
    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'assignedEmployee', select: 'name email role department' }
    ]);

    // Realtime Broadcast using Socket.IO (via Express app set instance)
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_created', ticket);
    }

    // Log Activity
    await Activity.create({
      user: req.user._id,
      action: 'Ticket Created',
      details: `Ticket ${ticket.ticketCode} (${ticket.title}) created. AI Category: ${ticket.category}. AI Priority: ${ticket.priority}`,
      module: 'Ticket',
      ipAddress: req.ip,
    });

    // Notify assigned employee if present
    if (assignedEmployee) {
      const notification = await Notification.create({
        recipient: assignedEmployee,
        sender: req.user._id,
        title: 'New Ticket Assigned',
        message: `Support Ticket ${ticket.ticketCode} ("${ticket.title}") was assigned to you.`,
        type: 'Ticket',
        link: `/tickets`,
      });

      if (io) {
        // Send real-time notification to the assignee room
        io.to(assignedEmployee.toString()).emit('notification_received', notification);
      }
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Ticket creation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update ticket status/priority
 * @route   PUT /api/tickets/:id
 * @access  Private (Admin, Manager, Employee)
 */
const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { status, priority, assignedEmployee, category } = req.body;
    let statusChanged = false;
    let assignmentChanged = false;
    let oldAssignee = ticket.assignedEmployee;

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

    // Populate
    await ticket.populate([
      { path: 'customer', select: 'companyName contactPerson email customerCode' },
      { path: 'assignedEmployee', select: 'name email role department' }
    ]);

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket_updated', ticket);
    }

    // Log Activity
    await Activity.create({
      user: req.user._id,
      action: 'Ticket Updated',
      details: `Ticket ${ticket.ticketCode} status updated to ${ticket.status} by ${req.user.name}.`,
      module: 'Ticket',
      ipAddress: req.ip,
    });

    // Handle notifications for assignments
    if (assignmentChanged && assignedEmployee) {
      const notification = await Notification.create({
        recipient: assignedEmployee,
        sender: req.user._id,
        title: 'Ticket Assigned',
        message: `Ticket ${ticket.ticketCode} ("${ticket.title}") has been assigned to you.`,
        type: 'Ticket',
        link: `/tickets`,
      });

      if (io) {
        io.to(assignedEmployee.toString()).emit('notification_received', notification);
      }
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Add comment to ticket
 * @route   POST /api/tickets/:id/comments
 * @access  Private
 */
const addTicketComment = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
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

    // Re-fetch ticket to get populated comment user details
    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('comments.commentedBy', 'name email role profilePicture')
      .populate('customer', 'companyName contactPerson email customerCode')
      .populate('assignedEmployee', 'name email role department');

    const addedComment = updatedTicket.comments[updatedTicket.comments.length - 1];

    // Emit live Socket.IO update specifically for this ticket
    const io = req.app.get('io');
    if (io) {
      io.emit('comment_added', {
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        comment: addedComment
      });
    }

    // Log Activity
    await Activity.create({
      user: req.user._id,
      action: 'Ticket Comment Added',
      details: `Comment added to Ticket ${ticket.ticketCode} by ${req.user.name}.`,
      module: 'Ticket',
      ipAddress: req.ip,
    });

    // Notify assigned employee if customer commented, or notify customer if employee commented
    const recipientId = (req.user.role === 'customer') 
      ? ticket.assignedEmployee 
      : null; // In real life, we resolve the Customer user ID. Let's notify assignee for now.
    
    if (recipientId && String(recipientId) !== String(req.user._id)) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        title: 'New Ticket Comment',
        message: `${req.user.name} commented on Ticket ${ticket.ticketCode}.`,
        type: 'Ticket',
        link: `/tickets`,
      });

      if (io) {
        io.to(recipientId.toString()).emit('notification_received', notification);
      }
    }

    res.status(201).json({ success: true, data: addedComment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get AI Reply Suggestions for ticket
 * @route   GET /api/tickets/:id/ai-suggestions
 * @access  Private (Admin, Manager, Employee)
 */
const getTicketAISuggestions = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('customer', 'contactPerson companyName');
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
    res.status(500).json({ success: false, error: error.message });
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
