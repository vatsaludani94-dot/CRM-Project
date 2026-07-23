const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const User = require('../models/User');
const AIService = require('../services/aiService');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

/**
 * @desc    Get all leads
 * @route   GET /api/leads
 * @access  Private (Admin, Manager, Employee)
 */
const getLeads = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    let query = { ...tenantFilter };
    
    // RBAC: Employees can only see their assigned leads
    if (req.user.role === 'employee') {
      query.assignedEmployee = req.user._id;
    }

    const leads = await Lead.find(query)
      .populate('assignedEmployee', 'name email role department')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create new lead
 * @route   POST /api/leads
 * @access  Private (Admin, Manager, Employee)
 */
const createLead = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const { company, contactName, email, phone, leadSource, expectedRevenue, assignedEmployee } = req.body;

    if (assignedEmployee) {
      const emp = await User.findOne({ _id: assignedEmployee, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    const lead = new Lead({
      company,
      contactName,
      email,
      phone,
      leadSource: leadSource || 'Website',
      expectedRevenue: expectedRevenue || 0,
      assignedEmployee: assignedEmployee || req.user._id,
      stage: 'New',
      tenant: tenantId,
    });

    // Predict AI conversion score
    lead.aiScore = await AIService.scoreLead({
      leadSource: lead.leadSource,
      expectedRevenue: lead.expectedRevenue,
      stage: lead.stage,
      notesCount: 0
    });

    await lead.save();

    await Activity.create({
      user: req.user._id,
      action: 'Lead Created',
      details: `Lead for ${lead.company} created by ${req.user.name}. Initial AI Score: ${lead.aiScore}%`,
      module: 'Lead',
      ipAddress: req.ip,
      tenant: tenantId,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update lead details (and drag/drop stage updates)
 * @route   PUT /api/leads/:id
 * @access  Private (Admin, Manager, Employee)
 */
const updateLead = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Check RBAC: Employees can only edit their own assigned leads
    if (req.user.role === 'employee' && lead.assignedEmployee && lead.assignedEmployee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this lead' });
    }

    if (req.body.assignedEmployee) {
      const emp = await User.findOne({ _id: req.body.assignedEmployee, ...tenantFilter });
      if (!emp) {
        return res.status(400).json({ success: false, error: 'Assigned employee does not belong to your workspace' });
      }
    }

    const { company, contactName, email, phone, leadSource, expectedRevenue, stage, assignedEmployee } = req.body;

    const fieldsToUpdate = { company, contactName, email, phone, leadSource, expectedRevenue, stage, assignedEmployee };
    let stageChanged = false;

    Object.keys(fieldsToUpdate).forEach(field => {
      if (fieldsToUpdate[field] !== undefined) {
        if (field === 'stage' && lead.stage !== fieldsToUpdate[field]) {
          stageChanged = true;
          lead.activityLog.push({
            type: 'System',
            description: `Stage moved from ${lead.stage} to ${fieldsToUpdate[field]}`,
            performedBy: req.user._id
          });
        }
        lead[field] = fieldsToUpdate[field];
      }
    });

    // Recalculate AI Score based on updates
    lead.aiScore = await AIService.scoreLead({
      leadSource: lead.leadSource,
      expectedRevenue: lead.expectedRevenue,
      stage: lead.stage,
      notesCount: lead.notes.length
    });

    await lead.save();

    await Activity.create({
      user: req.user._id,
      action: stageChanged ? 'Lead Stage Updated' : 'Lead Updated',
      details: `${lead.company} lead ${stageChanged ? `moved to ${lead.stage}` : 'details updated'} by ${req.user.name}. AI Score: ${lead.aiScore}%`,
      module: 'Lead',
      ipAddress: req.ip,
      tenant: lead.tenant,
    });

    if (lead.stage === 'Converted') {
      await autoConvertLeadToCustomer(lead, req.user._id);
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete lead
 * @route   DELETE /api/leads/:id
 * @access  Private (Admin, Manager)
 */
const deleteLead = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    await Activity.create({
      user: req.user._id,
      action: 'Lead Deleted',
      details: `Lead for ${lead.company} deleted by ${req.user.name}.`,
      module: 'Lead',
      ipAddress: req.ip,
      tenant: lead.tenant,
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Add note to lead
 * @route   POST /api/leads/:id/notes
 * @access  Private (Admin, Manager, Employee)
 */
const addLeadNote = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    lead.notes.push({
      content,
      createdBy: req.user._id,
    });

    lead.aiScore = await AIService.scoreLead({
      leadSource: lead.leadSource,
      expectedRevenue: lead.expectedRevenue,
      stage: lead.stage,
      notesCount: lead.notes.length
    });

    await lead.save();

    res.status(201).json({ success: true, data: lead.notes[lead.notes.length - 1], aiScore: lead.aiScore });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * Helper to auto-convert a Lead to a Customer within tenant scope
 */
const autoConvertLeadToCustomer = async (lead, userId) => {
  try {
    let customer = await Customer.findOne({ email: lead.email, tenant: lead.tenant });
    if (customer) {
      console.log(`Customer with email ${lead.email} already exists in workspace. Skipping customer creation.`);
      return;
    }

    customer = new Customer({
      companyName: lead.company,
      contactPerson: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      industry: 'Software & Technology',
      assignedEmployee: lead.assignedEmployee,
      status: 'Active',
      revenueGenerated: lead.expectedRevenue,
      tenant: lead.tenant,
    });

    lead.notes.forEach(note => {
      customer.notes.push({
        content: note.content,
        createdBy: note.createdBy,
        createdAt: note.createdAt
      });
    });

    lead.activityLog.forEach(activity => {
      customer.activities.push({
        type: activity.type === 'Proposal' ? 'Note' : activity.type,
        description: activity.description,
        performedBy: activity.performedBy,
        date: activity.date
      });
    });

    customer.activities.push({
      type: 'Lead Converted',
      description: `Lead converted successfully by Representative. Expected contract value: $${lead.expectedRevenue}`,
      performedBy: userId,
    });

    customer.leadHistory.push({
      stage: 'New',
      changedBy: userId,
      changedAt: lead.createdAt
    });
    customer.leadHistory.push({
      stage: 'Converted',
      changedBy: userId,
    });

    await customer.save();

    await Activity.create({
      user: userId,
      action: 'Lead Converted to Customer',
      details: `Lead ${lead.company} successfully converted to Customer ${customer.customerCode}. Contract: $${customer.revenueGenerated}`,
      module: 'Customer',
      tenant: lead.tenant,
    });

    console.log(`Lead ${lead.company} successfully converted to Customer ${customer.customerCode}.`);
  } catch (error) {
    console.error('Error during autoConvertLeadToCustomer:', error.message);
  }
};

module.exports = {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  addLeadNote,
};
