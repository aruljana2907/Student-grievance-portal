/**
 * Administrator Controller
 * 
 * Handles administrative overview, metrics, ticket triage, responses,
 * CSV exports, and audit logs inspection.
 */

const ticketService = require('../services/ticketService');
const auditService = require('../services/auditService');
const { ticketsToCsv } = require('../utils/csv');
const { getClientIp, getUserAgent } = require('../utils/audit');

/**
 * Get aggregated dashboard statistics for summary cards & Chart.js.
 */
async function getDashboardStats(req, res, next) {
  try {
    const stats = await ticketService.getAdminDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

/**
 * List all tickets with server-side filtering, searching, sorting, and pagination.
 */
async function getAllTickets(req, res, next) {
  const {
    status,
    category,
    type,
    priority,
    search,
    sortBy,
    sortOrder,
    page,
    limit,
  } = req.query;

  try {
    const result = await ticketService.getAllTicketsAdmin({
      status,
      category,
      type,
      priority,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Update ticket status and submit response.
 */
async function updateTicketStatus(req, res, next) {
  const adminId = req.session.user.id;
  const ticketId = parseInt(req.params.id, 10);
  const { status, message } = req.body;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (isNaN(ticketId)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const updated = await ticketService.updateTicketStatusAndRespond({
      ticketId,
      adminId,
      status,
      responseMessage: message,
    });

    await auditService.logEvent({
      userId: adminId,
      action: `STATUS_CHANGE:${updated.ticket_code} -> ${status.toUpperCase()}`,
      ip,
      userAgent,
    });

    res.json({
      message: 'Ticket status and response updated successfully.',
      ticket: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Export all tickets as a secured CSV file.
 */
async function exportTicketsCsv(req, res, next) {
  const adminId = req.session.user.id;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    const tickets = await ticketService.getAllTicketsForExport();
    const csvContent = ticketsToCsv(tickets);

    await auditService.logEvent({
      userId: adminId,
      action: 'CSV_EXPORT_DOWNLOADED',
      ip,
      userAgent,
    });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="grievance-tickets-${dateStr}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

/**
 * View security audit logs with pagination and filters.
 */
async function getAuditLogs(req, res, next) {
  const { limit = 50, offset = 0, action } = req.query;

  try {
    const result = await auditService.getAuditLogs({
      limit,
      offset,
      action,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAllTickets,
  updateTicketStatus,
  exportTicketsCsv,
  getAuditLogs,
};
