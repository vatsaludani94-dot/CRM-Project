const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const MarketingCampaign = require('../models/MarketingCampaign');
const CampaignRecipient = require('../models/CampaignRecipient');
const MarketingSubscription = require('../models/MarketingSubscription');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Activity = require('../models/Activity');
const { getTenantFilter, getTenantId, getWorkspaceIdentity } = require('../utils/tenantScope');
const { sendOutboundEmail } = require('../services/invoice-email.service');

const JWT_SECRET = process.env.JWT_SECRET || 'grownxcrm_jwt_secret_key_2026';

/**
 * Build safe MongoDB queries for Lead & Customer filtering
 */
const buildAudienceQueries = (audienceDefinition, tenantFilter) => {
  const { targetType, leadFilters = {}, customerFilters = {} } = audienceDefinition || {};
  const leadQuery = { ...tenantFilter };
  const customerQuery = { ...tenantFilter };

  // Lead Filters
  if (leadFilters.stages && leadFilters.stages.length > 0) {
    leadQuery.stage = { $in: leadFilters.stages };
  }
  if (leadFilters.leadSources && leadFilters.leadSources.length > 0) {
    leadQuery.leadSource = { $in: leadFilters.leadSources };
  }
  if ((leadFilters.minAiScore !== undefined && leadFilters.minAiScore !== null && Number(leadFilters.minAiScore) > 0) || (leadFilters.maxAiScore !== undefined && leadFilters.maxAiScore !== null)) {
    leadQuery.aiScore = {};
    if (leadFilters.minAiScore !== undefined && leadFilters.minAiScore !== null && Number(leadFilters.minAiScore) > 0) leadQuery.aiScore.$gte = Number(leadFilters.minAiScore);
    if (leadFilters.maxAiScore !== undefined && leadFilters.maxAiScore !== null) leadQuery.aiScore.$lte = Number(leadFilters.maxAiScore);
  }
  if ((leadFilters.minExpectedRevenue !== undefined && leadFilters.minExpectedRevenue !== null && Number(leadFilters.minExpectedRevenue) > 0) || (leadFilters.maxExpectedRevenue !== undefined && leadFilters.maxExpectedRevenue !== null)) {
    leadQuery.expectedRevenue = {};
    if (leadFilters.minExpectedRevenue !== undefined && leadFilters.minExpectedRevenue !== null && Number(leadFilters.minExpectedRevenue) > 0) leadQuery.expectedRevenue.$gte = Number(leadFilters.minExpectedRevenue);
    if (leadFilters.maxExpectedRevenue !== undefined && leadFilters.maxExpectedRevenue !== null) leadQuery.expectedRevenue.$lte = Number(leadFilters.maxExpectedRevenue);
  }
  if (leadFilters.inactiveDays) {
    const cutoff = new Date(Date.now() - Number(leadFilters.inactiveDays) * 24 * 60 * 60 * 1000);
    leadQuery.updatedAt = { $lte: cutoff };
  }

  // Customer Filters
  if (customerFilters.statuses && customerFilters.statuses.length > 0) {
    customerQuery.status = { $in: customerFilters.statuses };
  }
  if (customerFilters.healthStatuses && customerFilters.healthStatuses.length > 0) {
    customerQuery.healthStatus = { $in: customerFilters.healthStatuses };
  }
  if ((customerFilters.minHealthScore !== undefined && customerFilters.minHealthScore !== null && Number(customerFilters.minHealthScore) > 0) || (customerFilters.maxHealthScore !== undefined && customerFilters.maxHealthScore !== null)) {
    customerQuery.healthScore = {};
    if (customerFilters.minHealthScore !== undefined && customerFilters.minHealthScore !== null && Number(customerFilters.minHealthScore) > 0) customerQuery.healthScore.$gte = Number(customerFilters.minHealthScore);
    if (customerFilters.maxHealthScore !== undefined && customerFilters.maxHealthScore !== null) customerQuery.healthScore.$lte = Number(customerFilters.maxHealthScore);
  }
  if ((customerFilters.minRevenue !== undefined && customerFilters.minRevenue !== null && Number(customerFilters.minRevenue) > 0) || (customerFilters.maxRevenue !== undefined && customerFilters.maxRevenue !== null)) {
    customerQuery.revenueGenerated = {};
    if (customerFilters.minRevenue !== undefined && customerFilters.minRevenue !== null && Number(customerFilters.minRevenue) > 0) customerQuery.revenueGenerated.$gte = Number(customerFilters.minRevenue);
    if (customerFilters.maxRevenue !== undefined && customerFilters.maxRevenue !== null) customerQuery.revenueGenerated.$lte = Number(customerFilters.maxRevenue);
  }
  if (customerFilters.minOutstandingBalance !== undefined) {
    customerQuery.outstandingBalance = { $gte: Number(customerFilters.minOutstandingBalance) };
  }
  if (customerFilters.inactiveDays) {
    const cutoff = new Date(Date.now() - Number(customerFilters.inactiveDays) * 24 * 60 * 60 * 1000);
    customerQuery.updatedAt = { $lte: cutoff };
  }

  return { targetType: targetType || 'Leads', leadQuery, customerQuery };
};

/**
 * Personalization engine: Replace {{token}} in template string safely
 */
const renderPersonalizedText = (template, recipientData = {}, workspaceIdentity = {}) => {
  if (!template) return '';

  const contactName = recipientData.contactName || recipientData.contactPerson || 'Valued Contact';
  const firstName = contactName.split(' ')[0] || 'there';
  const companyName = recipientData.company || recipientData.companyName || 'your organization';
  const workspaceName = workspaceIdentity.communicationEmailName || workspaceIdentity.name || 'GrownX Workspace';
  const email = recipientData.email || '';

  let result = template;
  result = result.replace(/\{\{\s*contactName\s*\}\}/g, contactName);
  result = result.replace(/\{\{\s*firstName\s*\}\}/g, firstName);
  result = result.replace(/\{\{\s*companyName\s*\}\}/g, companyName);
  result = result.replace(/\{\{\s*workspaceName\s*\}\}/g, workspaceName);
  result = result.replace(/\{\{\s*email\s*\}\}/g, email);

  // Clean up any remaining unsupported {{tokens}} safely
  result = result.replace(/\{\{\s*[\w\.]+\s*\}\}/g, '');

  return result;
};

/**
 * Generate signed unsubscribe token for recipient
 */
const getJwtSecret = () => process.env.JWT_SECRET || 'grownxcrm_jwt_secret_key_2026';

/**
 * Generate signed unsubscribe token for recipient
 */
const generateUnsubscribeToken = (tenantId, email) => {
  const tid = typeof tenantId === 'object' && tenantId?._id ? tenantId._id.toString() : String(tenantId);
  return jwt.sign({ tenantId: tid, email: email.toLowerCase().trim() }, getJwtSecret(), { expiresIn: '365d' });
};

/**
 * @desc    Preview Audience Segmentation & Recipient Breakdown
 * @route   POST /api/marketing/audience/preview
 * @access  Private (Admin, Manager, Employee)
 */
const previewAudience = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const workspaceIdentity = await getWorkspaceIdentity(tenantId, req.user);

    const { targetType, leadQuery, customerQuery } = buildAudienceQueries(req.body.audienceDefinition, tenantFilter);

    let rawLeads = [];
    let rawCustomers = [];

    if (targetType === 'Leads' || targetType === 'Both') {
      rawLeads = await Lead.find(leadQuery).select('contactName company email phone stage aiScore expectedRevenue updatedAt');
    }
    if (targetType === 'Customers' || targetType === 'Both') {
      rawCustomers = await Customer.find(customerQuery).select('contactPerson companyName email phone status healthStatus revenueGenerated updatedAt');
    }

    const totalMatched = rawLeads.length + rawCustomers.length;

    // Fetch unsubscribed contacts for this tenant
    const tenantObjId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const unsubscribedRecords = await MarketingSubscription.find({
      tenant: { $in: [tenantId, tenantObjId] },
      status: 'unsubscribed',
    }).select('email');
    const unsubscribedSet = new Set(unsubscribedRecords.map((u) => u.email.toLowerCase()));

    const seenEmails = new Set();
    const eligibleList = [];

    let unsubscribedExcluded = 0;
    let duplicateExcluded = 0;
    let invalidEmailExcluded = 0;

    const emailRegex = /^\S+@\S+\.\S+$/;

    const sampleSubjectTemplate = req.body.emailContent?.subject || 'Exclusive Updates for {{contactName}}';
    const sampleBodyTemplate = req.body.emailContent?.body || 'Hi {{firstName}},\n\nWe wanted to share an update regarding {{companyName}} from {{workspaceName}}.';

    // Process Leads
    for (const lead of rawLeads) {
      const email = (lead.email || '').trim().toLowerCase();
      if (!email || !emailRegex.test(email)) {
        invalidEmailExcluded++;
        continue;
      }
      if (unsubscribedSet.has(email)) {
        unsubscribedExcluded++;
        continue;
      }
      if (seenEmails.has(email)) {
        duplicateExcluded++;
        continue;
      }
      seenEmails.add(email);
      eligibleList.push({
        id: lead._id,
        recipientType: 'lead',
        contactName: lead.contactName,
        companyName: lead.company,
        email,
      });
    }

    // Process Customers
    for (const cust of rawCustomers) {
      const email = (cust.email || '').trim().toLowerCase();
      if (!email || !emailRegex.test(email)) {
        invalidEmailExcluded++;
        continue;
      }
      if (unsubscribedSet.has(email)) {
        unsubscribedExcluded++;
        continue;
      }
      if (seenEmails.has(email)) {
        duplicateExcluded++;
        continue;
      }
      seenEmails.add(email);
      eligibleList.push({
        id: cust._id,
        recipientType: 'customer',
        contactName: cust.contactPerson,
        companyName: cust.companyName,
        email,
      });
    }

    const sampleRecipients = eligibleList.slice(0, 10).map((r) => ({
      ...r,
      personalizedSubjectPreview: renderPersonalizedText(sampleSubjectTemplate, r, workspaceIdentity),
      personalizedBodyPreview: renderPersonalizedText(sampleBodyTemplate, r, workspaceIdentity),
    }));

    res.json({
      success: true,
      data: {
        totalMatched,
        eligibleRecipients: eligibleList.length,
        unsubscribedExcluded,
        duplicateExcluded,
        invalidEmailExcluded,
        sampleRecipients,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get all tenant marketing campaigns
 * @route   GET /api/marketing/campaigns
 * @access  Private
 */
const getCampaigns = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaigns = await MarketingCampaign.find(tenantFilter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get single campaign with delivery metrics & recipients
 * @route   GET /api/marketing/campaigns/:id
 * @access  Private
 */
const getCampaignById = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const recipients = await CampaignRecipient.find({ campaign: campaign._id, ...tenantFilter })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: {
        campaign,
        recipients,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Create new campaign
 * @route   POST /api/marketing/campaigns
 * @access  Private (Admin, Manager, Employee)
 */
const createCampaign = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, description, type, audienceDefinition, emailContent, schedule } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Campaign name is required' });
    }
    if (!emailContent || !emailContent.subject || !emailContent.body) {
      return res.status(400).json({ success: false, error: 'Email subject and body are required' });
    }

    const initialStatus = schedule && schedule.sendType === 'Scheduled' && schedule.scheduledAt ? 'Scheduled' : 'Draft';

    const campaign = await MarketingCampaign.create({
      tenant: tenantId,
      name,
      description: description || '',
      type: type || 'Email Campaign',
      status: initialStatus,
      audienceDefinition: audienceDefinition || { targetType: 'Leads' },
      emailContent,
      schedule: schedule || { sendType: 'Now' },
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update campaign
 * @route   PUT /api/marketing/campaigns/:id
 * @access  Private (Admin, Manager, Employee)
 */
const updateCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (['Processing', 'Completed'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot modify a campaign in '${campaign.status}' state`,
      });
    }

    const updatableFields = ['name', 'description', 'type', 'audienceDefinition', 'emailContent', 'schedule', 'status'];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    campaign.updatedBy = req.user._id;
    await campaign.save();

    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete campaign
 * @route   DELETE /api/marketing/campaigns/:id
 * @access  Private (Admin, Manager)
 */
const deleteCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.status === 'Processing') {
      return res.status(400).json({ success: false, error: 'Cannot delete an actively processing campaign' });
    }

    await CampaignRecipient.deleteMany({ campaign: campaign._id, ...tenantFilter });
    await MarketingCampaign.deleteOne({ _id: campaign._id });

    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Send Test Email for Campaign
 * @route   POST /api/marketing/campaigns/:id/test
 * @access  Private (Admin, Manager, Employee)
 */
const sendTestEmail = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const { testEmail } = req.body;
    if (!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail.trim())) {
      return res.status(400).json({ success: false, error: 'Valid test email address is required' });
    }

    const normalizedTestEmail = testEmail.trim().toLowerCase();
    const tenantObjId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;

    // Check if test recipient is unsubscribed
    const unsubscribedCheck = await MarketingSubscription.findOne({
      tenant: { $in: [tenantId, tenantObjId] },
      email: normalizedTestEmail,
      status: 'unsubscribed',
    });

    if (unsubscribedCheck) {
      return res.status(400).json({
        success: false,
        error: `Cannot send test email: "${normalizedTestEmail}" has unsubscribed from marketing communications in this workspace.`,
      });
    }

    const workspaceIdentity = await getWorkspaceIdentity(tenantId, req.user);

    if (!workspaceIdentity.communicationEmail || workspaceIdentity.communicationEmailStatus === 'unconfigured') {
      return res.status(400).json({
        success: false,
        error: 'Workspace outbound email identity is unconfigured. Please configure workspace email settings first.',
      });
    }

    const sampleRecipient = {
      contactName: req.user.name || 'Sample Recipient',
      company: workspaceIdentity.name || 'GrownX CRM',
      email: normalizedTestEmail,
    };

    const personalizedSubject = `[TEST MODE] ${renderPersonalizedText(campaign.emailContent.subject, sampleRecipient, workspaceIdentity)}`;
    const rawBody = renderPersonalizedText(campaign.emailContent.body, sampleRecipient, workspaceIdentity);

    const unsubscribeToken = generateUnsubscribeToken(tenantObjId, normalizedTestEmail);
    const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
    const unsubscribeUrl = `${baseUrl}/api/marketing/unsubscribe/${unsubscribeToken}`;

    const testHtml = `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 12px; border-radius: 8px; font-family: sans-serif; font-size: 12px; margin-bottom: 16px;">
        ⚠️ <strong>CAMPAIGN PREVIEW / TEST MODE:</strong> This is a test preview email. It does not affect live campaign metrics.
      </div>
      <div>${rawBody}</div>
      <hr style="margin-top: 32px; border: 0; border-top: 1px solid #e7e5e4;" />
      <div style="font-size: 11px; color: #78716c; font-family: sans-serif; margin-top: 12px;">
        Sent via ${workspaceIdentity.communicationEmailName} (${workspaceIdentity.communicationEmail}) | 
        <a href="${unsubscribeUrl}" style="color: #d97706; text-decoration: underline;">Unsubscribe / Manage Preferences</a>
      </div>
    `;

    await sendOutboundEmail({
      to: normalizedTestEmail,
      subject: personalizedSubject,
      html: testHtml,
      fromName: workspaceIdentity.communicationEmailName,
      fromEmail: workspaceIdentity.communicationEmail,
      attachments: campaign.emailContent.attachments || [],
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${normalizedTestEmail}`,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * Execute actual campaign delivery with atomic execution lock & recipient tracking
 */
const executeCampaignDelivery = async (campaignId, tenantId, userId = null) => {
  const campaign = await MarketingCampaign.findOne({ _id: campaignId, tenant: tenantId });
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Check execution lock (prevent duplicate concurrent runs)
  if (campaign.executionState && campaign.executionState.status === 'processing') {
    // Check for stale lock timeout (older than 10 minutes)
    const lockAgeMs = Date.now() - new Date(campaign.executionState.executionStartedAt).getTime();
    if (lockAgeMs < 10 * 60 * 1000) {
      const err = new Error('Campaign execution is already processing by another process');
      err.statusCode = 400;
      throw err;
    }
  }

  if (campaign.status === 'Completed') {
    const err = new Error('Campaign has already completed execution');
    err.statusCode = 400;
    throw err;
  }

  // Acquire Lock Atomically
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  campaign.status = 'Processing';
  campaign.executionState = {
    status: 'processing',
    executionId,
    executionStartedAt: new Date(),
  };
  await campaign.save();

  try {
    const workspaceIdentity = await getWorkspaceIdentity(tenantId, userId ? { _id: userId } : null);

    if (!workspaceIdentity.communicationEmail || workspaceIdentity.communicationEmailStatus === 'unconfigured') {
      campaign.status = 'Failed';
      campaign.executionState.status = 'failed';
      campaign.executionState.executionCompletedAt = new Date();
      await campaign.save();
      throw new Error('Workspace outbound email identity is not configured. Delivery aborted.');
    }

    const { targetType, leadQuery, customerQuery } = buildAudienceQueries(campaign.audienceDefinition, { tenant: tenantId });

    let rawLeads = [];
    let rawCustomers = [];
    if (targetType === 'Leads' || targetType === 'Both') {
      rawLeads = await Lead.find(leadQuery);
    }
    if (targetType === 'Customers' || targetType === 'Both') {
      rawCustomers = await Customer.find(customerQuery);
    }

    // Fetch Unsubscribed Emails for Suppression
    const tenantObjId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const unsubscribedRecords = await MarketingSubscription.find({
      tenant: { $in: [tenantId, tenantObjId] },
      status: 'unsubscribed',
    });
    const unsubscribedSet = new Set(unsubscribedRecords.map((u) => u.email.toLowerCase()));

    const seenEmails = new Set();
    const recipientQueue = [];

    let unsubscribedCount = 0;
    let duplicateCount = 0;
    let invalidEmailCount = 0;
    const emailRegex = /^\S+@\S+\.\S+$/;

    // Build recipient queue from Leads
    for (const lead of rawLeads) {
      const email = (lead.email || '').trim().toLowerCase();
      if (!email || !emailRegex.test(email)) {
        invalidEmailCount++;
        continue;
      }
      if (seenEmails.has(email)) {
        duplicateCount++;
        continue;
      }
      seenEmails.add(email);
      recipientQueue.push({
        recipientType: 'lead',
        lead: lead._id,
        contactName: lead.contactName,
        companyName: lead.company,
        email,
        rawObj: lead,
      });
    }

    // Build recipient queue from Customers
    for (const cust of rawCustomers) {
      const email = (cust.email || '').trim().toLowerCase();
      if (!email || !emailRegex.test(email)) {
        invalidEmailCount++;
        continue;
      }
      if (seenEmails.has(email)) {
        duplicateCount++;
        continue;
      }
      seenEmails.add(email);
      recipientQueue.push({
        recipientType: 'customer',
        customer: cust._id,
        contactName: cust.contactPerson,
        companyName: cust.companyName,
        email,
        rawObj: cust,
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    for (const item of recipientQueue) {
      const normalizedEmail = item.email.trim().toLowerCase();
      const personalizedSubject = renderPersonalizedText(campaign.emailContent.subject, item, workspaceIdentity);
      const rawBody = renderPersonalizedText(campaign.emailContent.body, item, workspaceIdentity);

      const unsubscribeToken = generateUnsubscribeToken(tenantObjId, normalizedEmail);
      const unsubscribeUrl = `${baseUrl}/api/marketing/unsubscribe/${unsubscribeToken}`;

      const finalHtml = `
        <div>${rawBody}</div>
        <hr style="margin-top: 32px; border: 0; border-top: 1px solid #e7e5e4;" />
        <div style="font-size: 11px; color: #78716c; font-family: sans-serif; margin-top: 12px;">
          Sent by ${workspaceIdentity.communicationEmailName} (${workspaceIdentity.communicationEmail}) | 
          <a href="${unsubscribeUrl}" style="color: #d97706; text-decoration: underline;">Unsubscribe from marketing emails</a>
        </div>
      `;

      // FINAL REAL-TIME SUPPRESSION CHECK
      const isStillUnsubscribed = await MarketingSubscription.findOne({
        tenant: { $in: [tenantId, tenantObjId] },
        email: normalizedEmail,
        status: 'unsubscribed',
      });

      if (isStillUnsubscribed) {
        await CampaignRecipient.create({
          campaign: campaign._id,
          tenant: tenantId,
          recipientEmail: normalizedEmail,
          recipientType: item.recipientType,
          lead: item.lead,
          customer: item.customer,
          contactName: item.contactName,
          companyName: item.companyName,
          status: 'Suppressed',
          suppressionReason: 'marketing_unsubscribed',
          error: 'Recipient is unsubscribed from marketing communications for this workspace.',
          unsubscribeSkipped: true,
          personalizedSubject,
          personalizedContent: finalHtml,
        });
        unsubscribedCount++;
        continue;
      }

      const recipientDoc = await CampaignRecipient.create({
        campaign: campaign._id,
        tenant: tenantId,
        recipientEmail: item.email,
        recipientType: item.recipientType,
        lead: item.lead,
        customer: item.customer,
        contactName: item.contactName,
        companyName: item.companyName,
        status: 'Queued',
        personalizedSubject,
        personalizedContent: finalHtml,
      });

      try {
        const deliveryResult = await sendOutboundEmail({
          to: item.email,
          subject: personalizedSubject,
          html: finalHtml,
          fromName: workspaceIdentity.communicationEmailName,
          fromEmail: workspaceIdentity.communicationEmail,
          attachments: campaign.emailContent.attachments || [],
        });

        recipientDoc.status = 'Sent';
        recipientDoc.sentAt = new Date();
        recipientDoc.messageId = deliveryResult ? deliveryResult.messageId : `simulated-${Date.now()}`;
        await recipientDoc.save();

        sentCount++;

        // Append to CRM Activity Log / Timeline
        if (item.recipientType === 'lead' && item.rawObj) {
          item.rawObj.activityLog.push({
            type: 'System',
            description: `Marketing Campaign Email Sent: "${campaign.name}" (${personalizedSubject})`,
            performedBy: userId || undefined,
          });
          await item.rawObj.save();
        } else if (item.recipientType === 'customer' && item.rawObj) {
          item.rawObj.activities.push({
            type: 'Email',
            description: `Marketing Campaign Email Sent: "${campaign.name}" (${personalizedSubject})`,
            performedBy: userId || undefined,
          });
          await item.rawObj.save();
        }
      } catch (sendErr) {
        recipientDoc.status = 'Failed';
        recipientDoc.failedAt = new Date();
        recipientDoc.error = sendErr.message;
        await recipientDoc.save();

        failedCount++;
      }
    }

    // Finalize Campaign Metrics
    campaign.metrics = {
      totalMatched: rawLeads.length + rawCustomers.length,
      eligibleRecipients: recipientQueue.length,
      sentCount,
      deliveredCount: sentCount, // Default delivered = sent unless webhooks update
      failedCount,
      unsubscribedCount,
      duplicateCount,
      invalidEmailCount,
      openedCount: 0,
      clickedCount: 0,
      convertedCount: 0,
      revenueInfluenced: 0,
    };

    campaign.status = 'Completed';
    campaign.schedule.sentAt = new Date();
    campaign.schedule.completedAt = new Date();
    campaign.executionState = {
      status: 'completed',
      executionId,
      executionStartedAt: campaign.executionState.executionStartedAt,
      executionCompletedAt: new Date(),
    };

    await campaign.save();

    await Activity.create({
      user: userId || undefined,
      action: 'Marketing Campaign Executed',
      details: `Campaign "${campaign.name}" executed. Sent: ${sentCount}, Failed: ${failedCount}, Unsubscribed Excluded: ${unsubscribedCount}`,
      module: 'Marketing',
      tenant: tenantId,
    });

    return campaign;
  } catch (err) {
    campaign.status = 'Failed';
    campaign.executionState.status = 'failed';
    campaign.executionState.executionCompletedAt = new Date();
    await campaign.save();
    throw err;
  }
};

/**
 * @desc    Execute Immediate Campaign Delivery
 * @route   POST /api/marketing/campaigns/:id/send
 * @access  Private (Admin, Manager, Employee)
 */
const sendCampaignNow = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const tenantId = getTenantId(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const updatedCampaign = await executeCampaignDelivery(campaign._id, tenantId, req.user._id);

    res.json({
      success: true,
      message: `Campaign executed successfully. Sent to ${updatedCampaign.metrics.sentCount} recipients.`,
      data: updatedCampaign,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Pause a running/scheduled campaign
 * @route   POST /api/marketing/campaigns/:id/pause
 * @access  Private (Admin, Manager)
 */
const pauseCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    campaign.status = 'Paused';
    await campaign.save();

    res.json({ success: true, message: 'Campaign paused', data: campaign });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Resume a paused campaign
 * @route   POST /api/marketing/campaigns/:id/resume
 * @access  Private (Admin, Manager)
 */
const resumeCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    campaign.status = campaign.schedule.sendType === 'Scheduled' ? 'Scheduled' : 'Draft';
    await campaign.save();

    res.json({ success: true, message: 'Campaign resumed', data: campaign });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Cancel a campaign
 * @route   POST /api/marketing/campaigns/:id/cancel
 * @access  Private (Admin, Manager)
 */
const cancelCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    campaign.status = 'Cancelled';
    await campaign.save();

    res.json({ success: true, message: 'Campaign cancelled', data: campaign });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Process recipient unsubscribe request
 * @route   GET /api/marketing/unsubscribe/:token
 * @access  Public
 */
const unsubscribeRecipientToken = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, getJwtSecret());
    let rawTenantId = decoded.tenantId;
    if (typeof rawTenantId === 'object' && rawTenantId?._id) {
      rawTenantId = rawTenantId._id;
    }
    const tenantStr = String(rawTenantId);
    const tenantObjId = mongoose.Types.ObjectId.isValid(tenantStr) ? new mongoose.Types.ObjectId(tenantStr) : tenantStr;
    const { email } = decoded;
    if (!email) {
      return res.status(400).send('<h3>Invalid Unsubscribe Token</h3>');
    }
    const normalizedEmail = email.trim().toLowerCase();

    await MarketingSubscription.findOneAndUpdate(
      { tenant: { $in: [tenantStr, tenantObjId] }, email: normalizedEmail },
      {
        tenant: tenantObjId,
        email: normalizedEmail,
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
        unsubscribeReason: 'Recipient clicked unsubscribe link in email footer',
      },
      { upsert: true, new: true }
    );

    // Also append activity log to matching Lead or Customer if present
    try {
      const targetLead = await Lead.findOne({ tenant: tenantObjId, email: normalizedEmail });
      if (targetLead) {
        targetLead.activityLog.push({
          type: 'System',
          description: `Recipient unsubscribed from marketing communications via email footer link.`,
        });
        await targetLead.save();
      }
      const targetCustomer = await Customer.findOne({ tenant: tenantObjId, email: normalizedEmail });
      if (targetCustomer) {
        targetCustomer.activities.push({
          type: 'Email',
          description: `Recipient unsubscribed from marketing communications via email footer link.`,
        });
        await targetCustomer.save();
      }
    } catch (e) {
      console.error('[UNSUBSCRIBE ACTIVITY LOG ERROR]', e.message);
    }

    res.send(`
      <!Token HTML>
      <html>
        <head>
          <title>Unsubscribe Confirmed - GrownX CRM</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #fafaf9; color: #1c1917; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 16px; border: 1px solid #e7e5e4; text-align: center; max-width: 440px; shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            h2 { color: #d97706; margin-top: 0; }
            p { color: #57534e; font-size: 14px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Unsubscribed Successfully</h2>
            <p>Your email <strong>${email}</strong> has been unsubscribed from all marketing communications from this workspace.</p>
            <p style="font-size: 12px; color: #a8a29e;">You will no longer receive marketing emails. Transactional notices regarding invoices or support tickets are unaffected.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[UNSUBSCRIBE ERR]', err);
    res.status(400).send('<h3>Invalid or expired unsubscribe link</h3>');
  }
};

/**
 * @desc    Get aggregated marketing analytics for workspace
 * @route   GET /api/marketing/analytics
 * @access  Private
 */
const getMarketingAnalytics = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaigns = await MarketingCampaign.find(tenantFilter);

    const analytics = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => ['Processing', 'Scheduled'].includes(c.status)).length,
      completedCampaigns: campaigns.filter((c) => c.status === 'Completed').length,
      totalRecipients: campaigns.reduce((acc, c) => acc + (c.metrics?.sentCount || 0), 0),
      totalFailed: campaigns.reduce((acc, c) => acc + (c.metrics?.failedCount || 0), 0),
      totalUnsubscribedExcluded: campaigns.reduce((acc, c) => acc + (c.metrics?.unsubscribedCount || 0), 0),
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Schedule or Reschedule a marketing campaign
 * @route   POST /api/marketing/campaigns/:id/schedule
 * @access  Private (Admin, Manager, Employee)
 */
const scheduleCampaign = async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    const campaign = await MarketingCampaign.findOne({ _id: req.params.id, ...tenantFilter });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const { scheduledAt, timezone } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'Scheduled date and time (scheduledAt) is required.' });
    }

    const scheduleDate = new Date(scheduledAt);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid scheduled date format.' });
    }

    campaign.schedule = {
      sendType: 'Scheduled',
      scheduledAt: scheduleDate,
      timezone: timezone || 'Asia/Kolkata',
    };
    campaign.status = 'Scheduled';
    campaign.updatedBy = req.user._id;

    await campaign.save();

    res.json({
      success: true,
      message: `Campaign scheduled successfully for ${scheduleDate.toISOString()}`,
      data: campaign,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  previewAudience,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendTestEmail,
  sendCampaignNow,
  scheduleCampaign,
  executeCampaignDelivery,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  unsubscribeRecipientToken,
  getMarketingAnalytics,
};
