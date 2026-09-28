/**
 * Student Ticket Controller
 * 
 * Handles ticket creation, listing, details, editing, and deletion.
 * Server strictly verifies ownership for every student action.
 */

const ticketService = require('../services/ticketService');
const auditService = require('../services/auditService');
const { getClientIp, getUserAgent } = require('../utils/audit');

/**
 * Submit new grievance or feedback.
 */
async function createTicket(req, res, next) {
  const userId = req.session.user.id;
  const { type, category, subject, description, priority } = req.body;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    const ticket = await ticketService.createTicket({
      userId,
      type,
      category,
      subject,
      description,
      priority: priority || 'medium',
    });

    await auditService.logEvent({
      userId,
      action: `TICKET_CREATED:${ticket.ticket_code}`,
      ip,
      userAgent,
    });

    res.status(201).json({
      message: 'Your ticket has been submitted successfully.',
      ticket,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all tickets for current student.
 */
async function getMyTickets(req, res, next) {
  const userId = req.session.user.id;
  const { status, search, limit, offset } = req.query;

  try {
    const tickets = await ticketService.getTicketsByUser(userId, {
      status,
      search,
      limit,
      offset,
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

/**
 * Get ticket details by ID (with ownership check).
 */
async function getTicketById(req, res, next) {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  const ticketId = parseInt(req.params.id, 10);

  if (isNaN(ticketId)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const ticket = await ticketService.getTicketById(ticketId, userId, userRole);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * Edit pending ticket.
 */
async function updateTicket(req, res, next) {
  const userId = req.session.user.id;
  const ticketId = parseInt(req.params.id, 10);
  const { subject, description, category, type, priority } = req.body;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (isNaN(ticketId)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    const updated = await ticketService.updateTicket(ticketId, userId, {
      subject,
      description,
      category,
      type,
      priority,
    });

    await auditService.logEvent({
      userId,
      action: `TICKET_EDITED:${updated.ticket_code}`,
      ip,
      userAgent,
    });

    res.json({
      message: 'Ticket updated successfully.',
      ticket: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete pending ticket.
 */
async function deleteTicket(req, res, next) {
  const userId = req.session.user.id;
  const ticketId = parseInt(req.params.id, 10);
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (isNaN(ticketId)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    await ticketService.deleteTicket(ticketId, userId);

    await auditService.logEvent({
      userId,
      action: `TICKET_DELETED:ID_${ticketId}`,
      ip,
      userAgent,
    });

    res.json({ message: 'Ticket deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
};
