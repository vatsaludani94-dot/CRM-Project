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
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      subscriptionPlan: tenant.subscriptionPlan || '₹9,999 / Month',
      subscriptionAmount: tenant.subscriptionAmount || 9999,
      paidAt: tenant.paidAt,
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
