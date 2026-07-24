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

    // Trigger automated workflows
    try {
      const { triggerWorkflowEvents } = require('./workflowController');
      await triggerWorkflowEvents('Lead Created', 'Lead', lead._id, tenantId);
    } catch (wfErr) {
      console.error('Workflow trigger on lead creation error:', wfErr.message);
    }

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

    const { company, contactName, email, phone, leadSource, expectedRevenue, stage, stageKey, lostReason, assignedEmployee } = req.body;

    // If stage is being changed via updateLead, validate Lost Reason if target is Lost
    if (stage && stage !== lead.stage) {
      const PipelineStage = require('../models/PipelineStage');
      const tenantId = getTenantId(req);
      const targetStage = await PipelineStage.findOne({
        tenant: tenantId,
        $or: [{ name: stage }, { key: (stageKey || stage).toUpperCase() }]
      });

      if (targetStage && (targetStage.isLost || (targetStage.exitRules && targetStage.exitRules.includes('require_lost_reason')))) {
        const validReasons = ['Price', 'Competitor', 'No Response', 'Feature Gap', 'Not Interested', 'Other'];
        if (!lostReason || !validReasons.includes(lostReason)) {
          return res.status(400).json({
            success: false,
            error: `Lost reason is required when moving lead to a Lost stage. Valid reasons: ${validReasons.join(', ')}`
          });
        }
        lead.lostReason = lostReason;
      }
    }

    const fieldsToUpdate = { company, contactName, email, phone, leadSource, expectedRevenue, stage, stageKey, lostReason, assignedEmployee };
    let stageChanged = false;

    Object.keys(fieldsToUpdate).forEach(field => {
      if (fieldsToUpdate[field] !== undefined) {
        if (field === 'stage' && lead.stage !== fieldsToUpdate[field]) {
          stageChanged = true;
          lead.activityLog.push({
            type: 'System',
            description: `Stage moved from ${lead.stage} to ${fieldsToUpdate[field]}${lead.lostReason ? ` (Reason: ${lead.lostReason})` : ''}`,
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

    if (lead.stage === 'Converted' || lead.stage === 'Won' || lead.stageKey === 'WON') {
      await autoConvertLeadToCustomer(lead, req.user._id);
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Controlled stage transition for a lead
 * @route   POST /api/leads/:id/transition
 * @access  Private (Admin, Manager, Employee)
 */
const transitionLead = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Check RBAC: Employees can only transition their own assigned leads
    if (req.user.role === 'employee' && lead.assignedEmployee && lead.assignedEmployee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to transition this lead' });
    }

    const { targetStageKey, targetStageName, lostReason } = req.body;
    const searchTarget = targetStageKey || targetStageName;
    if (!searchTarget) {
      return res.status(400).json({ success: false, error: 'targetStageKey or targetStageName is required' });
    }

    const PipelineStage = require('../models/PipelineStage');
    const { ensureDefaultStages } = require('./pipelineController');
    await ensureDefaultStages(tenantId);

    const targetStage = await PipelineStage.findOne({
      tenant: tenantId,
      $or: [{ key: searchTarget.toUpperCase() }, { name: searchTarget }]
    });

    if (!targetStage) {
      return res.status(400).json({ success: false, error: `Target pipeline stage not found for '${searchTarget}'` });
    }

    // Validate Lost Reason requirement
    const validLostReasons = ['Price', 'Competitor', 'No Response', 'Feature Gap', 'Not Interested', 'Other'];
    if (targetStage.isLost || (targetStage.exitRules && targetStage.exitRules.includes('require_lost_reason'))) {
      if (!lostReason || !validLostReasons.includes(lostReason)) {
        return res.status(400).json({
          success: false,
          error: `Lost reason is required when moving lead to a Lost stage. Valid reasons: ${validLostReasons.join(', ')}`
        });
      }
      lead.lostReason = lostReason;
    } else {
      lead.lostReason = null;
    }

    const previousStage = lead.stage;
    const previousStageKey = lead.stageKey || 'NEW';

    lead.stage = targetStage.name;
    lead.stageKey = targetStage.key;

    lead.activityLog.push({
      type: 'System',
      description: `Stage moved from ${previousStage} to ${targetStage.name}${lead.lostReason ? ` (Reason: ${lead.lostReason})` : ''}`,
      performedBy: req.user._id
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
      action: 'Lead Stage Updated',
      details: `${lead.company} lead moved to ${targetStage.name}${lead.lostReason ? ` (${lead.lostReason})` : ''} by ${req.user.name}. AI Score: ${lead.aiScore}%`,
      module: 'Lead',
      ipAddress: req.ip,
      tenant: lead.tenant,
    });

    // If Won/Converted, auto-convert to customer
    if (targetStage.isWon || targetStage.key === 'WON' || targetStage.name === 'Won' || targetStage.name === 'Converted') {
      await autoConvertLeadToCustomer(lead, req.user._id);
    }

    const eventPayload = {
      eventType: 'lead.stage_changed',
      tenantId: lead.tenant,
      leadId: lead._id,
      previousStageKey,
      newStageKey: targetStage.key,
      previousStageName: previousStage,
      newStageName: targetStage.name,
      changedBy: req.user._id,
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: lead,
      stage: targetStage,
      event: eventPayload
    });
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

/**
 * @desc    Get unified chronological engagement timeline for a lead
 * @route   GET /api/leads/:id/timeline
 * @access  Private (Admin, Manager, Employee)
 */
const getLeadTimeline = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter }).populate('assignedEmployee', 'name email');
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // RBAC: Employees can only view timeline for assigned leads
    if (req.user.role === 'employee' && lead.assignedEmployee && lead.assignedEmployee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to view timeline for this lead' });
    }

    const LeadScoreHistory = require('../models/LeadScoreHistory');
    const WorkflowLog = require('../models/WorkflowLog');

    const scoreHistory = await LeadScoreHistory.find({ lead: lead._id, ...tenantFilter }).sort({ createdAt: -1 });
    const workflowLogs = await WorkflowLog.find({ entityId: lead._id, ...tenantFilter }).populate('workflow', 'name trigger').sort({ createdAt: -1 });

    const timelineEvents = [];

    // 1. Lead creation
    timelineEvents.push({
      type: 'Lead Created',
      title: 'Lead Profile Created',
      description: `Inbound lead profile created for ${lead.company} (${lead.contactName}). Expected value: $${lead.expectedRevenue.toLocaleString()}`,
      date: lead.createdAt,
      icon: 'person_add',
      badgeColor: '#3b82f6',
      source: 'System'
    });

    // 2. Lead activity log entries
    lead.activityLog.forEach(act => {
      let icon = 'history';
      let badgeColor = '#6b7280';
      if (act.type === 'Email') { icon = 'mail'; badgeColor = '#0284c7'; }
      else if (act.type === 'Call') { icon = 'call'; badgeColor = '#8b5cf6'; }
      else if (act.type === 'Meeting') { icon = 'calendar_month'; badgeColor = '#eab308'; }
      else if (act.type === 'Proposal') { icon = 'receipt_long'; badgeColor = '#d97706'; }
      else if (act.type === 'System') { icon = 'alt_route'; badgeColor = '#10b981'; }

      timelineEvents.push({
        type: act.type || 'Activity',
        title: `${act.type || 'Activity'} Event`,
        description: act.description,
        date: act.date,
        icon,
        badgeColor,
        source: 'User'
      });
    });

    // 3. Lead notes
    lead.notes.forEach(note => {
      timelineEvents.push({
        type: 'Note Added',
        title: 'Staff Interaction Note',
        description: note.content,
        date: note.createdAt,
        icon: 'sticky_note_2',
        badgeColor: '#ec4899',
        source: 'Staff'
      });
    });

    // 4. Score History
    scoreHistory.forEach(sh => {
      timelineEvents.push({
        type: 'AI Score Updated',
        title: `AI Score Updated to ${sh.newScore}% (${sh.scoreChange >= 0 ? '+' : ''}${sh.scoreChange}%)`,
        description: `Recalculated via ${sh.model} model. Reason: ${sh.reason}`,
        date: sh.createdAt,
        icon: 'psychology',
        badgeColor: '#f59e0b',
        source: 'AI Engine'
      });
    });

    // 5. Workflow logs
    workflowLogs.forEach(wl => {
      timelineEvents.push({
        type: 'Workflow Executed',
        title: `Workflow Automated: ${wl.workflow ? wl.workflow.name : 'Automation Rule'}`,
        description: `Executed trigger [${wl.workflow ? wl.workflow.trigger : 'System'}] with status: ${wl.status}`,
        date: wl.createdAt,
        icon: 'auto_mode',
        badgeColor: '#6366f1',
        source: 'Workflow Engine'
      });
    });

    // Sort chronologically (newest first)
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      leadId: lead._id,
      count: timelineEvents.length,
      data: timelineEvents
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get detailed explainable lead score & history
 * @route   GET /api/leads/:id/score
 * @access  Private (Admin, Manager, Employee)
 */
const getLeadScore = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const LeadScoreHistory = require('../models/LeadScoreHistory');
    const scoreAnalysis = await AIService.scoreLeadExplainable({
      leadSource: lead.leadSource,
      expectedRevenue: lead.expectedRevenue,
      stage: lead.stage,
      notesCount: lead.notes.length,
      activityCount: lead.activityLog.length
    });

    const recentHistory = await LeadScoreHistory.find({ lead: lead._id, ...tenantFilter })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        currentScore: lead.aiScore,
        probability: scoreAnalysis.probability,
        factors: scoreAnalysis.factors,
        model: scoreAnalysis.model,
        lastScoredAt: lead.updatedAt,
        history: recentHistory
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Manually refresh explainable lead AI score and log score history
 * @route   POST /api/leads/:id/score/refresh
 * @access  Private (Admin, Manager, Employee)
 */
const refreshLeadScore = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const LeadScoreHistory = require('../models/LeadScoreHistory');
    const previousScore = lead.aiScore || 50;

    const scoreAnalysis = await AIService.scoreLeadExplainable({
      leadSource: lead.leadSource,
      expectedRevenue: lead.expectedRevenue,
      stage: lead.stage,
      notesCount: lead.notes.length,
      activityCount: lead.activityLog.length
    });

    const newScore = scoreAnalysis.score;
    const scoreChange = newScore - previousScore;

    lead.aiScore = newScore;
    lead.activityLog.push({
      type: 'System',
      description: `AI Score refreshed: ${previousScore}% → ${newScore}% (${scoreChange >= 0 ? '+' : ''}${scoreChange}%)`,
      performedBy: req.user._id
    });
    await lead.save();

    // Create Score History Record
    const historyRecord = await LeadScoreHistory.create({
      lead: lead._id,
      tenant: tenantId,
      previousScore,
      newScore,
      scoreChange,
      factors: scoreAnalysis.factors,
      model: scoreAnalysis.model,
      reason: `Manual score refresh by ${req.user.name}`
    });

    res.json({
      success: true,
      message: 'Lead AI score refreshed successfully',
      data: {
        currentScore: newScore,
        probability: newScore,
        scoreChange,
        factors: scoreAnalysis.factors,
        model: scoreAnalysis.model,
        historyEntry: historyRecord
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getLeads,
  createLead,
  updateLead,
  transitionLead,
  deleteLead,
  addLeadNote,
  getLeadTimeline,
  getLeadScore,
  refreshLeadScore,
};
