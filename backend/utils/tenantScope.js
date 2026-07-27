const Tenant = require('../models/Tenant');
const User = require('../models/User');

/**
 * Helper to build a safe tenant filter for database queries.
 * @param {Object} req - Express request object containing req.user
 * @returns {Object} { tenant: ObjectId } for tenant users, or {} for super_admin
 */
const getTenantFilter = (req) => {
  if (!req.user) {
    const error = new Error('Not authorized: User context missing');
    error.statusCode = 401;
    throw error;
  }

  // Platform global super_admin (unassociated or with explicit query) has global access
  if (req.user.role === 'super_admin' && !req.user.tenant) {
    return req.query && req.query.tenantId ? { tenant: req.query.tenantId } : {};
  }

  if (!req.user.tenant) {
    const error = new Error('Not authorized: Account is not associated with any workspace tenant');
    error.statusCode = 403;
    throw error;
  }

  const tenantId = req.user.tenant._id || req.user.tenant;
  return { tenant: tenantId };
};

/**
 * Extracts the raw tenant ID for record creation.
 * @param {Object} req - Express request object
 * @returns {ObjectId|string|null} Tenant ID
 */
const getTenantId = (req) => {
  if (!req.user) return null;
  if (req.user.tenant) {
    return req.user.tenant._id || req.user.tenant;
  }
  return null;
};

/**
 * Resolves complete Workspace Identity, separating auth email from outbound communication email.
 * @param {ObjectId|string} tenantId 
 * @param {Object} userReq 
 */
const getWorkspaceIdentity = async (tenantId, userReq) => {
  if (!tenantId) {
    return {
      workspaceName: 'GrownX CRM Workspace',
      communicationEmail: userReq?.email || 'contact@grownxcrm.com',
      communicationEmailName: userReq?.name || 'GrownX Support',
      communicationEmailStatus: 'unconfigured',
      theme: 'light',
      subscriptionStatus: 'active',
      subscriptionPlan: '₹9,999 / Month',
      subscriptionAmount: 9999,
    };
  }

  try {
    const tenant = await Tenant.findById(tenantId).populate('owner', 'name email');
    if (!tenant) {
      return {
        workspaceName: 'GrownX CRM Workspace',
        communicationEmail: userReq?.email || 'contact@grownxcrm.com',
        communicationEmailName: userReq?.name || 'GrownX Support',
        communicationEmailStatus: 'unconfigured',
        theme: 'light',
      };
    }

    const workspaceName = tenant.workspaceName || tenant.name || 'GrownX Workspace';
    const ownerEmail = tenant.owner ? tenant.owner.email : userReq?.email;
    const communicationEmail = tenant.communicationEmail || ownerEmail || 'contact@grownxcrm.com';
    const communicationEmailName = tenant.communicationEmailName || workspaceName;
    const communicationEmailStatus = (tenant.communicationEmailStatus && tenant.communicationEmailStatus !== 'unconfigured') ? tenant.communicationEmailStatus : (communicationEmail ? 'verified' : 'unconfigured');

    let currentSubStatus = tenant.subscriptionStatus || 'active';
    let trialDaysRemaining = 0;
    const trialExpires = tenant.trialEndDate || tenant.trialExpiresAt;

    if (currentSubStatus === 'trial_active' && trialExpires) {
      const now = Date.now();
      const expiresMs = new Date(trialExpires).getTime();
      if (now > expiresMs) {
        currentSubStatus = 'trial_expired';
        tenant.subscriptionStatus = 'trial_expired';
        await tenant.save();
      } else {
        trialDaysRemaining = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
      }
    }

    // Compute usage metrics for value-demonstration insights
    const Customer = require('../models/Customer');
    const Lead = require('../models/Lead');
    const Ticket = require('../models/Ticket');
    const Workflow = require('../models/Workflow');
    const MarketingCampaign = require('../models/MarketingCampaign');

    const [customersCount, leadsCount, ticketsCount, workflowsCount, campaignsCount] = await Promise.all([
      Customer.countDocuments({ tenant: tenant._id }),
      Lead.countDocuments({ tenant: tenant._id }),
      Ticket.countDocuments({ tenant: tenant._id }),
      Workflow.countDocuments({ tenant: tenant._id }),
      MarketingCampaign.countDocuments({ tenant: tenant._id }),
    ]);

    return {
      tenantId: tenant._id,
      workspaceName,
      communicationEmail,
      communicationEmailName,
      communicationEmailStatus,
      theme: tenant.theme || 'light',
      logo: tenant.whiteLabelSettings?.logo || '',
      primaryColor: tenant.whiteLabelSettings?.primaryColor || '#6366f1',
      secondaryColor: tenant.whiteLabelSettings?.secondaryColor || '#0f172a',
      whiteLabelSettings: tenant.whiteLabelSettings || {},
      smtpConfigured: !!(tenant.smtpSettings && tenant.smtpSettings.host),
      subscriptionStatus: currentSubStatus,
      subscriptionPlan: tenant.subscriptionPlan || '₹9,999 / Month',
      subscriptionAmount: tenant.subscriptionAmount || 9999,
      paidAt: tenant.paidAt,
      renewalDate: tenant.renewalDate || (tenant.paidAt ? new Date(new Date(tenant.paidAt).setMonth(new Date(tenant.paidAt).getMonth() + 1)) : null),
      billingCycle: tenant.billingCycle || 'monthly',
      setupWizardCompleted: tenant.setupWizardCompleted !== false,
      paymentHistory: tenant.paymentHistory || [],
      trialStartDate: tenant.trialStartDate,
      trialEndDate: trialExpires,
      trialDaysRemaining,
      usageMetrics: {
        customersAdded: customersCount,
        leadsCreated: leadsCount,
        ticketsManaged: ticketsCount,
        workflowsBuilt: workflowsCount,
        campaignsRun: campaignsCount,
      },
    };
  } catch (err) {
    return {
      workspaceName: 'GrownX CRM Workspace',
      communicationEmail: userReq?.email || 'contact@grownxcrm.com',
      communicationEmailName: userReq?.name || 'GrownX Support',
      communicationEmailStatus: 'unconfigured',
      theme: 'light',
      logo: '',
      primaryColor: '#6366f1',
      secondaryColor: '#0f172a',
      smtpConfigured: false,
    };
  }
};

module.exports = {
  getTenantFilter,
  getTenantId,
  getWorkspaceIdentity,
};
