/**
 * Student Tickets Routes
 */

const express = require('express');
const router = express.Router();

const ticketController = require('../controllers/ticketController');
const { requireAuth } = require('../middleware/auth');
const { doubleCsrfProtection } = require('../middleware/csrf');
const {
  validateTicketCreation,
  validateTicketUpdate,
} = require('../middleware/validate');

// All ticket routes require an authenticated user
router.use(requireAuth);

router.get('/', ticketController.getMyTickets);
router.post('/', doubleCsrfProtection, validateTicketCreation, ticketController.createTicket);

router.get('/:id', ticketController.getTicketById);
router.put('/:id', doubleCsrfProtection, validateTicketUpdate, ticketController.updateTicket);
router.delete('/:id', doubleCsrfProtection, ticketController.deleteTicket);

module.exports = router;
