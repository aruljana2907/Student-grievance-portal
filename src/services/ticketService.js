/**
 * Ticket Service & Repository Layer
 * 
 * SECURITY NOTICE:
 * All SQL queries in this file use parameterized statements with the mysql2 promise API.
 * User-supplied input is NEVER interpolated or concatenated into queries.
 * This guarantees complete protection against SQL Injection attacks (CWE-89).
 */

const db = require('../config/db');
const { generateTicketCode } = require('../utils/ticketCode');

/**
 * Create a new grievance or feedback ticket.
 */
async function createTicket({ userId, type, category, subject, description, priority = 'medium' }) {
  const pool = db.getPool();

  // Temporary code to satisfy NOT NULL UNIQUE before obtaining insertId
  const tempCode = generateTicketCode(type);

  const insertSql = `
    INSERT INTO tickets (ticket_code, user_id, type, category, subject, description, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
  `;
  const insertParams = [tempCode, userId, type, category, subject.trim(), description.trim(), priority];

  const [result] = await pool.execute(insertSql, insertParams);
  const ticketId = result.insertId;

  // Format canonical code: GRV-2026-0001
  const canonicalCode = generateTicketCode(type, ticketId);
  await pool.execute(`UPDATE tickets SET ticket_code = ? WHERE id = ?`, [canonicalCode, ticketId]);

  return getTicketById(ticketId, userId, 'student');
}

/**
 * Retrieve tickets submitted by a specific student with responses.
 */
async function getTicketsByUser(userId, { status, search, limit = 50, offset = 0 } = {}) {
  const pool = db.getPool();

  let sql = `
    SELECT 
      t.id,
      t.ticket_code,
      t.user_id,
      t.type,
      t.category,
      t.subject,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      (
        SELECT r.message 
        FROM responses r 
        WHERE r.ticket_id = t.id 
        ORDER BY r.created_at DESC 
        LIMIT 1
      ) as latest_response,
      (
        SELECT r.created_at 
        FROM responses r 
        WHERE r.ticket_id = t.id 
        ORDER BY r.created_at DESC 
        LIMIT 1
      ) as response_date
    FROM tickets t
    WHERE t.user_id = ?
  `;
  const params = [userId];

  if (status && ['pending', 'in_review', 'resolved'].includes(status.toLowerCase())) {
    sql += ` AND t.status = ?`;
    params.push(status.toLowerCase());
  }

  if (search && search.trim() !== '') {
    sql += ` AND (t.ticket_code LIKE ? OR t.subject LIKE ? OR t.description LIKE ?)`;
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Retrieve a single ticket by ID with full responses thread.
 * Enforces ownership check: If role is 'student', userId MUST match ticket.user_id.
 */
async function getTicketById(ticketId, userId = null, role = 'student') {
  const pool = db.getPool();

  const sql = `
    SELECT 
      t.id,
      t.ticket_code,
      t.user_id,
      t.type,
      t.category,
      t.subject,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      u.name as student_name,
      u.register_no as student_register_no,
      u.email as student_email,
      u.department as student_department
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [ticketId]);
  const ticket = rows[0];

  if (!ticket) {
    return null;
  }

  // Authorization / IDOR Protection: Students can only access their own tickets
  if (role === 'student' && ticket.user_id !== userId) {
    const error = new Error('Access denied: You do not have permission to view this ticket.');
    error.status = 403;
    throw error;
  }

  // Fetch responses
  const respSql = `
    SELECT 
      r.id,
      r.ticket_id,
      r.admin_id,
      r.message,
      r.created_at,
      u.name as admin_name
    FROM responses r
    JOIN users u ON r.admin_id = u.id
    WHERE r.ticket_id = ?
    ORDER BY r.created_at ASC
  `;
  const [responses] = await pool.execute(respSql, [ticketId]);

  ticket.responses = responses;
  return ticket;
}

/**
 * Edit a ticket.
 * Rules:
 * 1. Only student owner can edit.
 * 2. Ticket MUST be in 'pending' status.
 */
async function updateTicket(ticketId, userId, { subject, description, category, type, priority }) {
  const pool = db.getPool();

  // Check existence, ownership, and status
  const ticket = await getTicketById(ticketId, userId, 'student');
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.status = 404;
    throw err;
  }

  if (ticket.status !== 'pending') {
    const err = new Error('Only tickets with Pending status can be edited.');
    err.status = 400;
    throw err;
  }

  const sql = `
    UPDATE tickets 
    SET subject = ?, description = ?, category = ?, type = ?, priority = ?, updated_at = NOW()
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `;
  const params = [
    subject.trim(),
    description.trim(),
    category,
    type,
    priority || ticket.priority,
    ticketId,
    userId,
  ];

  await pool.execute(sql, params);
  return getTicketById(ticketId, userId, 'student');
}

/**
 * Delete a ticket.
 * Rules:
 * 1. Only student owner can delete.
 * 2. Ticket MUST be in 'pending' status.
 */
async function deleteTicket(ticketId, userId) {
  const pool = db.getPool();

  const ticket = await getTicketById(ticketId, userId, 'student');
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.status = 404;
    throw err;
  }

  if (ticket.status !== 'pending') {
    const err = new Error('Only tickets with Pending status can be deleted.');
    err.status = 400;
    throw err;
  }

  const sql = `DELETE FROM tickets WHERE id = ? AND user_id = ? AND status = 'pending'`;
  await pool.execute(sql, [ticketId, userId]);
  return { success: true };
}

/**
 * Admin: Get all tickets with filtering, searching, sorting, and pagination.
 */
async function getAllTicketsAdmin({
  status,
  category,
  type,
  priority,
  search,
  sortBy = 'created_at',
  sortOrder = 'DESC',
  page = 1,
  limit = 10,
} = {}) {
  const pool = db.getPool();

  const validSortColumns = {
    created_at: 't.created_at',
    updated_at: 't.updated_at',
    ticket_code: 't.ticket_code',
    priority: 't.priority',
    status: 't.status',
    category: 't.category',
  };
  const orderColumn = validSortColumns[sortBy] || 't.created_at';
  const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = [];
  let params = [];

  if (status && status !== 'all') {
    whereClauses.push(`t.status = ?`);
    params.push(status.toLowerCase());
  }

  if (category && category !== 'all') {
    whereClauses.push(`t.category = ?`);
    params.push(category.toLowerCase());
  }

  if (type && type !== 'all') {
    whereClauses.push(`t.type = ?`);
    params.push(type.toLowerCase());
  }

  if (priority && priority !== 'all') {
    whereClauses.push(`t.priority = ?`);
    params.push(priority.toLowerCase());
  }

  if (search && search.trim() !== '') {
    whereClauses.push(
      `(t.ticket_code LIKE ? OR t.subject LIKE ? OR t.description LIKE ? OR u.name LIKE ? OR u.register_no LIKE ?)`
    );
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total 
    FROM tickets t 
    JOIN users u ON t.user_id = u.id 
    ${whereSql}
  `;
  const [countResult] = await pool.query(countSql, params);
  const total = countResult[0]?.total || 0;

  // Get paginated rows
  const dataSql = `
    SELECT 
      t.id,
      t.ticket_code,
      t.user_id,
      t.type,
      t.category,
      t.subject,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      u.name as student_name,
      u.register_no as student_register_no,
      u.department as student_department,
      (
        SELECT r.message 
        FROM responses r 
        WHERE r.ticket_id = t.id 
        ORDER BY r.created_at DESC 
        LIMIT 1
      ) as latest_response,
      (
        SELECT u2.name 
        FROM responses r 
        JOIN users u2 ON r.admin_id = u2.id
        WHERE r.ticket_id = t.id 
        ORDER BY r.created_at DESC 
        LIMIT 1
      ) as responder_name
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ${whereSql}
    ORDER BY ${orderColumn} ${orderDirection}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limitNum, offset];
  const [tickets] = await pool.query(dataSql, dataParams);

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Admin: Update ticket status and optionally add response message.
 */
async function updateTicketStatusAndRespond({ ticketId, adminId, status, responseMessage }) {
  const pool = db.getPool();

  // Validate status
  if (!['pending', 'in_review', 'resolved'].includes(status)) {
    const err = new Error('Invalid status value.');
    err.status = 400;
    throw err;
  }

  // Update status
  const updateSql = `UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?`;
  const [updateResult] = await pool.execute(updateSql, [status, ticketId]);

  if (updateResult.affectedRows === 0) {
    const err = new Error('Ticket not found.');
    err.status = 404;
    throw err;
  }

  // If response message provided, insert into responses
  if (responseMessage && responseMessage.trim() !== '') {
    const respSql = `
      INSERT INTO responses (ticket_id, admin_id, message, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    await pool.execute(respSql, [ticketId, adminId, responseMessage.trim()]);
  }

  return getTicketById(ticketId, adminId, 'admin');
}

/**
 * Admin: Get aggregation statistics for summary cards and Chart.js charts.
 */
async function getAdminDashboardStats() {
  const pool = db.getPool();

  // Status counts
  const [statusRows] = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM tickets 
    GROUP BY status
  `);

  // Category counts
  const [categoryRows] = await pool.query(`
    SELECT category, COUNT(*) as count 
    FROM tickets 
    GROUP BY category 
    ORDER BY count DESC
  `);

  // Monthly submissions trend (last 6 months)
  const [monthlyRows] = await pool.query(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COUNT(*) as count
    FROM tickets
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  // Totals
  const [totalRows] = await pool.query(`
    SELECT 
      COUNT(*) as total_tickets,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review_count,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
      SUM(CASE WHEN type = 'grievance' THEN 1 ELSE 0 END) as grievance_count,
      SUM(CASE WHEN type = 'feedback' THEN 1 ELSE 0 END) as feedback_count
    FROM tickets
  `);

  const summary = totalRows[0] || {
    total_tickets: 0,
    pending_count: 0,
    in_review_count: 0,
    resolved_count: 0,
    grievance_count: 0,
    feedback_count: 0,
  };

  return {
    summary,
    byStatus: statusRows,
    byCategory: categoryRows,
    byMonth: monthlyRows,
  };
}

/**
 * Admin: Retrieve all tickets for CSV export.
 */
async function getAllTicketsForExport() {
  const pool = db.getPool();
  const sql = `
    SELECT 
      t.ticket_code,
      t.type,
      t.category,
      t.subject,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      t.updated_at,
      u.register_no,
      u.name,
      u.department,
      (
        SELECT r.message 
        FROM responses r 
        WHERE r.ticket_id = t.id 
        ORDER BY r.created_at DESC 
        LIMIT 1
      ) as latest_response
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `;
  const [rows] = await pool.query(sql);
  return rows;
}

module.exports = {
  createTicket,
  getTicketsByUser,
  getTicketById,
  updateTicket,
  deleteTicket,
  getAllTicketsAdmin,
  updateTicketStatusAndRespond,
  getAdminDashboardStats,
  getAllTicketsForExport,
};
