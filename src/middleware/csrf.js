/**
 * Cross-Site Request Forgery (CSRF) Protection Middleware
 * 
 * Uses csrf-csrf for Double-Submit Cookie CSRF protection.
 * Protects all state-changing HTTP methods (POST, PUT, DELETE, PATCH).
 */

const { doubleCsrf } = require('csrf-csrf');
const env = require('../config/env');

const {
  invalidCsrfTokenError,
  generateToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: 'sgp_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.COOKIE_SECURE,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf;
  },
});

/**
 * Custom CSRF error handler wrapper
 */
function csrfErrorHandler(err, req, res, next) {
  if (err === invalidCsrfTokenError || err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      code: 'CSRF_VALIDATION_FAILED',
    });
  }
  next(err);
}

module.exports = {
  doubleCsrfProtection,
  generateToken,
  invalidCsrfTokenError,
  csrfErrorHandler,
};
