/**
 * Audit Logging Helper.
 * Captures request context (client IP, User-Agent, user_id) and records
 * events to the database audit_logs table.
 */

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  );
}

function getUserAgent(req) {
  return (req.headers['user-agent'] || 'Unknown').substring(0, 255);
}

module.exports = {
  getClientIp,
  getUserAgent,
};
