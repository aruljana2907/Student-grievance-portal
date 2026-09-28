/**
 * Admin Routes
 * 
 * Protected by requireAuth and requireRole('admin')
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { doubleCsrfProtection } = require('../middleware/csrf');
const { validateStatusUpdate } = require('../middleware/validate');

// Strictly require Admin role
router.use(requireAuth, requireRole('admin'));

router.get('/stats', adminController.getDashboardStats);
router.get('/tickets', adminController.getAllTickets);
router.put('/tickets/:id/status', doubleCsrfProtection, validateStatusUpdate, adminController.updateTicketStatus);
router.get('/export', adminController.exportTicketsCsv);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
