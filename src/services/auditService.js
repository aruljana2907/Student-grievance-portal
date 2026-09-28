/**
 * Audit Logging Service Layer
 * 
 * SECURITY NOTICE:
 * All database operations in this service strictly use parameterized queries (prepared statements).
 * User input is NEVER concatenated or interpolated into SQL strings, preventing SQL Injection (CWE-89).
 */

const db = require('../config/db');

/**
 * Record a security or system event in the audit_logs table.
 * @param {Object} params
 * @param {number|null} params.userId
 * @param {string} params.action - e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'STATUS_CHANGE'
 * @param {string} params.ip
 * @param {string} params.userAgent
 */
async function logEvent({ userId = null, action, ip, userAgent = '' }) {
  const sql = `
    INSERT INTO audit_logs (user_id, action, ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, NOW())
  `;
  const params = [userId, action, ip, userAgent ? userAgent.substring(0, 255) : null];
  
  try {
    const pool = db.getPool();
    const [result] = await pool.execute(sql, params);
    return result.insertId;
  } catch (err) {
    // Non-blocking error handling for audit logs to prevent breaking primary flows
    console.error('[AuditService] Failed to record audit log:', err.message);
    return null;
  }
}

/**
 * Retrieve audit logs with optional filtering, pagination, and user details.
 * Admin only.
 */
async function getAuditLogs({ limit = 50, offset = 0, action = null }) {
  const pool = db.getPool();
  let sql = `
    SELECT 
      a.id,
      a.user_id,
      a.action,
      a.ip,
      a.user_agent,
      a.created_at,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
  `;
  
  const params = [];
  
  if (action && action.trim() !== '') {
    sql += ` WHERE a.action = ?`;
    params.push(action.trim());
  }
  
  sql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await pool.query(sql, params);

  // Get total count
  let countSql = `SELECT COUNT(*) as total FROM audit_logs a`;
  const countParams = [];
  if (action && action.trim() !== '') {
    countSql += ` WHERE a.action = ?`;
    countParams.push(action.trim());
  }
  const [countResult] = await pool.query(countSql, countParams);
  const total = countResult[0]?.total || 0;

  return { logs: rows, total };
}

module.exports = {
  logEvent,
  getAuditLogs,
};
