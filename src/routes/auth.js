/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { doubleCsrfProtection } = require('../middleware/csrf');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');
const {
  validateRegistration,
  validateLogin,
  validateChangePassword,
} = require('../middleware/validate');

// CSRF token retrieval endpoint
router.get('/csrf-token', authController.getCsrfToken);

// Public Auth Endpoints
router.post('/register', registerLimiter, doubleCsrfProtection, validateRegistration, authController.register);
router.post('/login', loginLimiter, doubleCsrfProtection, validateLogin, authController.login);

// Authenticated Endpoints
router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/logout', requireAuth, doubleCsrfProtection, authController.logout);
router.post('/change-password', requireAuth, doubleCsrfProtection, validateChangePassword, authController.changePassword);

module.exports = router;
