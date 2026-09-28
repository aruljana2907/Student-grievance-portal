/**
 * Centralized Error Handling Middleware
 * 
 * SECURITY:
 * Never leaks internal stack traces, database schema details, or system paths
 * to the client (CWE-209: Information Exposure Through an Error Message).
 */

function errorHandler(err, req, res, next) {
  // If headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;

  // Log full error details securely on the server
  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}]`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }

  // Sanitize message for client consumption
  let clientMessage = err.message || 'An unexpected error occurred. Please try again later.';

  // Hide raw SQL syntax/database error messages from client
  if (statusCode === 500 || err.sqlMessage || err.code?.startsWith('ER_')) {
    clientMessage = 'An internal database or server error occurred. Please contact the administrator.';
  }

  res.status(statusCode).json({
    error: clientMessage,
    code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
  });
}

// 404 Handler for undefined API routes
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
