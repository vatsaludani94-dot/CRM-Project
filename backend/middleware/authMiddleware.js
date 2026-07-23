const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is missing');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // CRITICAL FIX: Reject temporary 2FA-pending tokens on protected API routes
      if (decoded.is2faPending) {
        return res.status(401).json({
          success: false,
          is2faPending: true,
          error: '2FA verification pending. Complete 2FA challenge first.',
        });
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
      }

      if (req.user.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'User account is deactivated' });
      }

      // SESSION INVALIDATION & REVOCATION ENFORCEMENT:
      // Reject tokens issued prior to security events (password change/reset, session revocation)
      if (
        decoded.tokenVersion !== undefined &&
        decoded.tokenVersion !== (req.user.tokenVersion || 0)
      ) {
        return res.status(401).json({
          success: false,
          sessionRevoked: true,
          error: 'Session has been invalidated due to a security update. Please log in again.',
        });
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
  }
};

const requireTenant = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }
  if (!req.user || !req.user.tenant) {
    return res.status(403).json({
      success: false,
      requireWorkspaceOnboarding: true,
      error: 'Not authorized: User is not associated with any workspace tenant',
    });
  }
  next();
};

module.exports = { protect, requireTenant };
