/**
 * Rate Limiting Middleware
 * 
 * SECURITY:
 * Prevents automated credential stuffing, brute-force dictionary attacks,
 * and denial-of-service spam on sensitive endpoints.
 */

const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10,  // Stricter in production/dev, relaxed for automated unit tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many account registrations from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. Please slow down your requests.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  generalApiLimiter,
};
