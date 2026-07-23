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

  // Platform super_admin has global access unless a specific tenant scope is passed
  if (req.user.role === 'super_admin') {
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

module.exports = {
  getTenantFilter,
  getTenantId,
};
