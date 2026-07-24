const PipelineStage = require('../models/PipelineStage');
const Lead = require('../models/Lead');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

/**
 * Idempotent helper to initialize default pipeline stages for a workspace
 */
const ensureDefaultStages = async (tenantId) => {
  if (!tenantId) return;

  const count = await PipelineStage.countDocuments({ tenant: tenantId });
  if (count > 0) return;

  const defaultStages = [
    {
      tenant: tenantId,
      name: 'New',
      key: 'NEW',
      order: 1,
      color: '#3b82f6',
      probability: 10,
      isWon: false,
      isLost: false,
      isSystemStage: true,
      exitRules: [],
    },
    {
      tenant: tenantId,
      name: 'Contacted',
      key: 'CONTACTED',
      order: 2,
      color: '#0284c7',
      probability: 20,
      isWon: false,
      isLost: false,
      isSystemStage: true,
      exitRules: [],
    },
    {
      tenant: tenantId,
      name: 'Interested',
      key: 'INTERESTED',
      order: 3,
      color: '#8b5cf6',
      probability: 40,
      isWon: false,
      isLost: false,
      isSystemStage: true,
      exitRules: [],
    },
    {
      tenant: tenantId,
      name: 'Proposal Sent',
      key: 'PROPOSAL_SENT',
      order: 4,
      color: '#d97706',
      probability: 60,
      isWon: false,
      isLost: false,
      isSystemStage: true,
      exitRules: [],
    },
    {
      tenant: tenantId,
      name: 'Negotiation',
      key: 'NEGOTIATION',
      order: 5,
      color: '#eab308',
      probability: 75,
      isWon: false,
      isLost: false,
      isSystemStage: true,
      exitRules: [],
    },
    {
      tenant: tenantId,
      name: 'Won',
      key: 'WON',
      order: 6,
      color: '#10b981',
      probability: 100,
      isWon: true,
      isLost: false,
      isSystemStage: true,
      exitRules: [],
    },
    {
      tenant: tenantId,
      name: 'Lost',
      key: 'LOST',
      order: 7,
      color: '#ef4444',
      probability: 0,
      isWon: false,
      isLost: true,
      isSystemStage: true,
      exitRules: ['require_lost_reason'],
    },
  ];

  try {
    await PipelineStage.insertMany(defaultStages, { ordered: false });
  } catch (err) {
    // Ignore duplicate key race condition if initialized concurrently
    if (!err.message.includes('E11000')) {
      console.error('Error auto-initializing default pipeline stages:', err.message);
    }
  }
};

/**
 * @desc    Get all pipeline stages for current workspace
 * @route   GET /api/pipeline/stages
 * @access  Private (All Roles)
 */
const getStages = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'User is not associated with a workspace tenant' });
    }

    await ensureDefaultStages(tenantId);

    const stages = await PipelineStage.find({ tenant: tenantId }).sort({ order: 1 });

    res.json({ success: true, count: stages.length, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create a new pipeline stage
 * @route   POST /api/pipeline/stages
 * @access  Private (Admin, Owner, Manager)
 */
const createStage = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, color, probability, exitRules } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Stage display name is required' });
    }

    const key = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const existing = await PipelineStage.findOne({ tenant: tenantId, key });
    if (existing) {
      return res.status(400).json({ success: false, error: `Pipeline stage with key ${key} already exists in your workspace` });
    }

    const maxOrderStage = await PipelineStage.findOne({ tenant: tenantId }).sort({ order: -1 });
    const order = maxOrderStage ? maxOrderStage.order + 1 : 1;

    const stage = new PipelineStage({
      tenant: tenantId,
      name: name.trim(),
      key,
      order,
      color: color || '#d97706',
      probability: probability !== undefined ? Math.max(0, Math.min(100, Number(probability))) : 50,
      exitRules: Array.isArray(exitRules) ? exitRules : [],
    });

    await stage.save();

    res.status(201).json({ success: true, data: stage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update a pipeline stage
 * @route   PUT /api/pipeline/stages/:id
 * @access  Private (Admin, Owner, Manager)
 */
const updateStage = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const stage = await PipelineStage.findOne({ _id: req.params.id, ...tenantFilter });
    if (!stage) {
      return res.status(404).json({ success: false, error: 'Pipeline stage not found' });
    }

    const { name, color, probability, order, exitRules } = req.body;

    if (name && name.trim()) stage.name = name.trim();
    if (color) stage.color = color;
    if (probability !== undefined) stage.probability = Math.max(0, Math.min(100, Number(probability)));
    if (order !== undefined) stage.order = Number(order);
    if (Array.isArray(exitRules)) stage.exitRules = exitRules;

    await stage.save();

    res.json({ success: true, data: stage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete a custom pipeline stage
 * @route   DELETE /api/pipeline/stages/:id
 * @access  Private (Admin, Owner, Manager)
 */
const deleteStage = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const stage = await PipelineStage.findOne({ _id: req.params.id, ...tenantFilter });
    if (!stage) {
      return res.status(404).json({ success: false, error: 'Pipeline stage not found' });
    }

    if (stage.isSystemStage || stage.isWon || stage.isLost) {
      return res.status(400).json({ success: false, error: 'System stages (Won, Lost, Default) cannot be deleted' });
    }

    // Check if leads exist in this stage
    const activeLeadsCount = await Lead.countDocuments({
      $or: [{ stageKey: stage.key }, { stage: stage.name }],
      ...tenantFilter,
    });

    if (activeLeadsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete stage containing ${activeLeadsCount} active lead(s). Reassign leads first.`,
      });
    }

    await stage.deleteOne();

    res.json({ success: true, message: 'Pipeline stage deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  ensureDefaultStages,
  getStages,
  createStage,
  updateStage,
  deleteStage,
};
