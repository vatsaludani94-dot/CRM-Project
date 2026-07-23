const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userRole = req.user.role;

    // workspace_owner has workspace-level administrative access (matching manager or super_admin)
    const isAuthorized = roles.includes(userRole) ||
      (userRole === 'workspace_owner' && (roles.includes('manager') || roles.includes('super_admin')));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: `User role '${userRole}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { authorize };
