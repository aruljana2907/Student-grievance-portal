/**
 * Environment configuration and validation.
 * Centralizes all process.env access with sensible, secure defaults.
 */
require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'grievance_portal',
  DB_CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  
  // Security
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production_min32chars',
  CSRF_SECRET: process.env.CSRF_SECRET || 'dev_csrf_secret_change_in_production_min32chars',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  
  // Account policies
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  LOCK_TIME_MINUTES: parseInt(process.env.LOCK_TIME_MINUTES || '5', 10),
  SESSION_IDLE_TIMEOUT_MINUTES: parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '30', 10),
};

module.exports = env;
