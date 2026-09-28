/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 * 
 * SECURITY:
 * Enforces session validity and checks authorized user roles before
 * granting access to protected routes.
 */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to proceed.',
      code: 'UNAUTHENTICATED',
    });
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
        code: 'UNAUTHENTICATED',
      });
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
