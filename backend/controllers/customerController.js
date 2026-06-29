const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { autoCreateCustomerFolder } = require('./driveController');
const EmailMessage = require('../models/EmailMessage');
const Document = require('../models/Document');
const Task = require('../models/Task');


/**
 * @desc    Get all customers with search and filtering
 * @route   GET /api/customers
 * @access  Private (Admin, Manager, Employee)
 */
const getCustomers = async (req, res) => {
  try {
    const { search, status, industry, assignedEmployee } = req.query;
    let query = {};

    // RBAC: Employees can only see their assigned customers (unless they are Manager/SuperAdmin)
    if (req.user.role === 'employee') {
      query.assignedEmployee = req.user._id;
    } else if (assignedEmployee) {
      query.assignedEmployee = assignedEmployee;
    }

    // Search query
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { customerCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filters
    if (status) query.status = status;
    if (industry) query.industry = industry;

    const customers = await Customer.find(query)
      .populate('assignedEmployee', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get single customer
 * @route   GET /api/customers/:id
 * @access  Private
 */
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedEmployee', 'name email role')
      .populate('notes.createdBy', 'name email')
      .populate('activities.performedBy', 'name email')
      .populate('leadHistory.changedBy', 'name email');

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // RBAC check: Customers can only see themselves. Employees can only see assigned.
    if (req.user.role === 'customer' && req.user.email !== customer.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this customer file' });
    }
    if (req.user.role === 'employee' && customer.assignedEmployee && customer.assignedEmployee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized, customer not assigned to you' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get Customer 360 View Consolidated Data
 * @route   GET /api/customers/:id/360
 * @access  Private
 */
const getCustomer360 = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedEmployee', 'name email role department')
      .populate('notes.createdBy', 'name email profilePicture')
      .populate('activities.performedBy', 'name email')
      .populate('leadHistory.changedBy', 'name email');

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Fetch all tickets for this customer
    const tickets = await Ticket.find({ customer: customer._id })
      .populate('assignedEmployee', 'name email department')
      .sort({ createdAt: -1 });

    // Fetch emails, documents, and tasks for unified timeline (Module K)
    const emailsList = await EmailMessage.find({ customer: customer._id }).sort({ createdAt: -1 });
    const documentsList = await Document.find({ customer: customer._id }).sort({ createdAt: -1 });
    const tasksList = await Task.find({ customer: customer._id }).sort({ createdAt: -1 });

    let timeline = [];

    // Customer Registration
    timeline.push({
      event: 'Customer Registered',
      description: `Customer account was created for ${customer.companyName}. Code: ${customer.customerCode}`,
      date: customer.createdAt,
      type: 'system',
      icon: 'how_to_reg'
    });

    // Lead History
    customer.leadHistory.forEach(history => {
      const actorName = history.changedBy ? history.changedBy.name : 'System';
      if (history.stage === 'New') {
        timeline.push({
          event: 'Lead Created',
          description: `Lead for ${customer.companyName} was created in pipeline by ${actorName}.`,
          date: history.changedAt,
          type: 'lead',
          icon: 'contact_page'
        });
      } else if (history.stage === 'Converted') {
        timeline.push({
          event: 'Lead Converted',
          description: `Lead converted successfully into Active Customer by ${actorName}.`,
          date: history.changedAt,
          type: 'lead_converted',
          icon: 'monetization_on'
        });
      }
    });

    // Tickets Opened & Closed
    tickets.forEach(ticket => {
      timeline.push({
        event: 'Ticket Opened',
        description: `Support Ticket ${ticket.ticketCode} (${ticket.title}) was opened. Priority: ${ticket.priority}`,
        date: ticket.createdAt,
        type: 'ticket_opened',
        icon: 'bug_report',
        refId: ticket._id
      });

      if (['Resolved', 'Closed'].includes(ticket.status)) {
        timeline.push({
          event: 'Ticket Closed',
          description: `Support Ticket ${ticket.ticketCode} marked as ${ticket.status}.`,
          date: ticket.updatedAt,
          type: 'ticket_closed',
          icon: 'check_circle',
          refId: ticket._id
        });
      }
    });

    // Outgoing/Incoming Emails (Module K Timeline tracking)
    emailsList.forEach(email => {
      timeline.push({
        event: email.direction === 'incoming' ? 'Email Received' : 'Email Sent',
        description: `Subject: "${email.subject}" - ${email.direction === 'incoming' ? 'From:' : 'To:'} ${email.direction === 'incoming' ? email.from : email.to}`,
        date: email.createdAt,
        type: 'email',
        icon: email.direction === 'incoming' ? 'mail' : 'send',
        refId: email._id
      });
    });

    // Documents (Contracts, Proposals, Invoices)
    documentsList.forEach(doc => {
      timeline.push({
        event: `${doc.type} Generated`,
        description: `${doc.type} "${doc.name}" was saved. Status: ${doc.status} - Total Amount: $${doc.metadata?.netAmount}`,
        date: doc.createdAt,
        type: 'document',
        icon: 'description',
        refId: doc._id
      });
    });

    // Tasks Hub
    tasksList.forEach(task => {
      timeline.push({
        event: 'Task Scheduled',
        description: `Task: "${task.title}". Priority: ${task.priority} - Status: ${task.status}`,
        date: task.createdAt,
        type: 'task',
        icon: 'assignment_turned_in',
        refId: task._id
      });
    });

    // Activities Logged (Calls, Emails, Meetings)
    customer.activities.forEach(activity => {
      const performer = activity.performedBy ? activity.performedBy.name : 'Representative';
      let icon = 'phone';
      if (activity.type === 'Email') icon = 'email';
      if (activity.type === 'Meeting') icon = 'groups';
      if (activity.type === 'Note') icon = 'description';
      
      timeline.push({
        event: `${activity.type} Logged`,
        description: `${activity.description} (Logged by ${performer})`,
        date: activity.date,
        type: 'activity',
        icon: icon
      });
    });

    // Notes Added
    customer.notes.forEach(note => {
      const writer = note.createdBy ? note.createdBy.name : 'System';
      timeline.push({
        event: 'Notes Added',
        description: `Internal memo added: "${note.content}" (Written by ${writer})`,
        date: note.createdAt,
        type: 'note',
        icon: 'chat'
      });
    });

    // Sort timeline chronologically (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        customer,
        tickets,
        revenueGenerated: customer.revenueGenerated,
        timeline
      }
    });
  } catch (error) {
    console.error('Customer 360 error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create new customer
 * @route   POST /api/customers
 * @access  Private (Admin, Manager, Employee)
 */
const createCustomer = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, address, industry, status, revenueGenerated, assignedEmployee } = req.body;

    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      return res.status(400).json({ success: false, error: 'Customer already exists with this email' });
    }

    const customer = new Customer({
      companyName,
      contactPerson,
      email,
      phone,
      address,
      industry,
      status: status || 'Active',
      revenueGenerated: revenueGenerated || 0,
      assignedEmployee: assignedEmployee || req.user._id,
      leadHistory: [{ stage: 'New', changedBy: req.user._id }]
    });

    // If status is active/VIP immediately, simulate lead conversion history
    if (status && status !== 'Inactive') {
      customer.leadHistory.push({ stage: 'Converted', changedBy: req.user._id });
    }

    await customer.save();

    // Auto-create Google Drive folder structure
    try {
      await autoCreateCustomerFolder(customer, req.user.tenant);
    } catch (driveErr) {
      console.error('Failed to auto-create customer folder:', driveErr.message);
    }

    // Log System Activity
    await Activity.create({
      user: req.user._id,
      action: 'Customer Created',
      details: `Customer ${customer.companyName} (${customer.customerCode}) created by ${req.user.name}.`,
      module: 'Customer',
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update customer
 * @route   PUT /api/customers/:id
 * @access  Private (Admin, Manager, Employee)
 */
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Fields to update
    const updatableFields = [
      'companyName', 'contactPerson', 'email', 'phone', 'address', 'industry',
      'assignedEmployee', 'status', 'revenueGenerated'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    await customer.save();

    await Activity.create({
      user: req.user._id,
      action: 'Customer Updated',
      details: `Customer ${customer.companyName} updated by ${req.user.name}.`,
      module: 'Customer',
      ipAddress: req.ip,
    });

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete customer
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin, Manager)
 */
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    await Customer.findByIdAndDelete(req.params.id);

    await Activity.create({
      user: req.user._id,
      action: 'Customer Deleted',
      details: `Customer ${customer.companyName} (${customer.customerCode}) deleted by ${req.user.name}.`,
      module: 'Customer',
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Customer record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Add note to customer profile
 * @route   POST /api/customers/:id/notes
 * @access  Private (Admin, Manager, Employee)
 */
const addCustomerNote = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    customer.notes.push({
      content,
      createdBy: req.user._id,
    });

    await customer.save();

    // Log Activity
    customer.activities.push({
      type: 'Note',
      description: `Note added: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
      performedBy: req.user._id
    });
    await customer.save();

    res.status(201).json({ success: true, data: customer.notes[customer.notes.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Log interaction activity (Call/Email/Meeting)
 * @route   POST /api/customers/:id/activities
 * @access  Private (Admin, Manager, Employee)
 */
const logCustomerActivity = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const { type, description } = req.body;
    if (!type || !description) {
      return res.status(400).json({ success: false, error: 'Activity type and description are required' });
    }

    customer.activities.push({
      type,
      description,
      performedBy: req.user._id,
    });

    await customer.save();

    res.status(201).json({ success: true, data: customer.activities[customer.activities.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomer360,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerNote,
  logCustomerActivity,
};
