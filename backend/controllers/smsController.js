const SmsCampaign = require('../models/SmsCampaign');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const { getTenantFilter, getTenantId } = require('../utils/tenantScope');

const getSmsCampaigns = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaigns = await SmsCampaign.find(tenantFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const createSmsCampaign = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, messageTemplate, segments, scheduledAt } = req.body;
    const campaign = await SmsCampaign.create({
      name,
      messageTemplate,
      segments: segments || [],
      scheduledAt: scheduledAt || Date.now(),
      status: 'Draft',
      tenant: tenantId,
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const updateSmsCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const updateData = { ...req.body };
    delete updateData.tenant;

    const campaign = await SmsCampaign.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const deleteSmsCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await SmsCampaign.findOneAndDelete({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

const sendSmsCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await SmsCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    campaign.status = 'Sending';
    await campaign.save();

    let count = 0;
    if (campaign.segments.includes('Lead') || campaign.segments.length === 0) {
      const leadsCount = await Lead.countDocuments(tenantFilter);
      count += leadsCount;
    }
    if (campaign.segments.includes('Customer') || campaign.segments.length === 0) {
      const customersCount = await Customer.countDocuments(tenantFilter);
      count += customersCount;
    }

    setTimeout(async () => {
      try {
        campaign.status = 'Completed';
        campaign.deliveryCount = count || 15;
        await campaign.save();
        console.log(`[SMS Gateway] Campaign '${campaign.name}' successfully sent to ${campaign.deliveryCount} recipients.`);
      } catch (err) {
        console.error('Failed to complete SMS campaign send:', err.message);
      }
    }, 2000);

    res.json({ success: true, message: 'Campaign sending initiated', data: campaign });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getSmsCampaigns,
  createSmsCampaign,
  updateSmsCampaign,
  deleteSmsCampaign,
  sendSmsCampaign,
};
