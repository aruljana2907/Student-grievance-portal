/**
 * Request Validation & Sanitization Middleware
 * 
 * Uses express-validator to enforce schema rules, sanitize inputs,
 * and validate security constraints (e.g. password policies).
 */

const { body, query, validationResult } = require('express-validator');

// Reusable middleware to inspect validation results
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg,
      field: firstError.path || firstError.param,
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
      })),
    });
  }
  next();
}

// Password Policy: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const passwordPolicy = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long.')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter.')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter.')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number.');

// 1. Student Registration Validation Rules
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.')
    .escape(),
  body('registerNo')
    .trim()
    .notEmpty()
    .withMessage('Register number is required.')
    .isLength({ min: 3, max: 50 })
    .withMessage('Register number must be between 3 and 50 characters.')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Register number can only contain letters, numbers, hyphens, and underscores.')
    .toUpperCase(),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters.')
    .escape(),
  passwordPolicy,
  handleValidationErrors,
];

// 2. Login Validation Rules
const validateLogin = [
  body('registerNo')
    .trim()
    .notEmpty()
    .withMessage('Register number or email is required.'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
  handleValidationErrors,
];

// 3. Ticket Submission Validation Rules
const validateTicketCreation = [
  body('type')
    .trim()
    .isIn(['grievance', 'feedback'])
    .withMessage('Type must be either "grievance" or "feedback".'),
  body('category')
    .trim()
    .isIn([
      'academic',
      'hostel',
      'infrastructure',
      'canteen',
      'examination',
      'library',
      'transportation',
      'other',
    ])
    .withMessage('Invalid category selected.'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject line is required.')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters.'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required.')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters.'),
  body('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level.'),
  handleValidationErrors,
];

// 4. Ticket Edit Validation Rules
const validateTicketUpdate = [
  body('type')
    .trim()
    .isIn(['grievance', 'feedback'])
    .withMessage('Type must be either "grievance" or "feedback".'),
  body('category')
    .trim()
    .isIn([
      'academic',
      'hostel',
      'infrastructure',
      'canteen',
      'examination',
      'library',
      'transportation',
      'other',
    ])
    .withMessage('Invalid category selected.'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required.')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters.'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required.')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters.'),
  body('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level.'),
  handleValidationErrors,
];

// 5. Admin Status Update & Response Validation
const validateStatusUpdate = [
  body('status')
    .trim()
    .isIn(['pending', 'in_review', 'resolved'])
    .withMessage('Status must be "pending", "in_review", or "resolved".'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Response message cannot exceed 2000 characters.'),
  handleValidationErrors,
];

// 6. Change Password Validation
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long.')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter.')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter.')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number.'),
  handleValidationErrors,
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateTicketCreation,
  validateTicketUpdate,
  validateStatusUpdate,
  validateChangePassword,
  handleValidationErrors,
};
