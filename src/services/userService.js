/**
 * User Service & Repository Layer
 * 
 * SECURITY NOTICE:
 * All queries in this file strictly utilize prepared statements with parameter binding.
 * No raw user input is ever concatenated into SQL commands. This strictly guards
 * against SQL Injection vulnerabilities (OWASP Top 10 A03:2021).
 */

const bcrypt = require('bcrypt');
const db = require('../config/db');
const env = require('../config/env');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Register a new student user.
 * Admins are strictly created via seeding scripts, never public registration.
 */
async function createStudent({ name, registerNo, email, department, password }) {
  const pool = db.getPool();

  // Hash password with bcrypt cost 12
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const sql = `
    INSERT INTO users (role, name, register_no, email, department, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;
  const params = ['student', name.trim(), registerNo.trim().toUpperCase(), email.trim().toLowerCase(), department.trim(), passwordHash];

  const [result] = await pool.execute(sql, params);
  return {
    id: result.insertId,
    role: 'student',
    name: name.trim(),
    registerNo: registerNo.trim().toUpperCase(),
    email: email.trim().toLowerCase(),
    department: department.trim(),
  };
}

/**
 * Find user by unique register number.
 */
async function findUserByRegisterNo(registerNo) {
  const pool = db.getPool();
  const sql = `SELECT * FROM users WHERE register_no = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [registerNo.trim().toUpperCase()]);
  return rows[0] || null;
}

/**
 * Find user by unique email.
 */
async function findUserByEmail(email) {
  const pool = db.getPool();
  const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [email.trim().toLowerCase()]);
  return rows[0] || null;
}

/**
 * Find user by ID (excluding password hash).
 */
async function findUserById(id) {
  const pool = db.getPool();
  const sql = `
    SELECT id, role, name, register_no, email, department, created_at, locked_until
    FROM users 
    WHERE id = ? 
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows[0] || null;
}

/**
 * Verify user password using bcrypt.
 */
async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Record a failed login attempt. Locks account for 5 minutes if limit reached.
 * Generic response: Returns whether the account is currently locked without leaking existence.
 */
async function recordFailedLogin(userId, currentFailedAttempts = 0) {
  const pool = db.getPool();
  const nextAttempts = currentFailedAttempts + 1;
  let lockedUntil = null;

  if (nextAttempts >= env.MAX_LOGIN_ATTEMPTS) {
    const lockMinutes = env.LOCK_TIME_MINUTES;
    const lockDate = new Date(Date.now() + lockMinutes * 60 * 1000);
    lockedUntil = lockDate;

    const sql = `
      UPDATE users 
      SET failed_attempts = ?, locked_until = ? 
      WHERE id = ?
    `;
    await pool.execute(sql, [nextAttempts, lockDate, userId]);
  } else {
    const sql = `
      UPDATE users 
      SET failed_attempts = ? 
      WHERE id = ?
    `;
    await pool.execute(sql, [nextAttempts, userId]);
  }

  return { attempts: nextAttempts, isLocked: nextAttempts >= env.MAX_LOGIN_ATTEMPTS };
}

/**
 * Reset failed attempts and remove lockout after successful login.
 */
async function resetFailedAttempts(userId) {
  const pool = db.getPool();
  const sql = `
    UPDATE users 
    SET failed_attempts = 0, locked_until = NULL 
    WHERE id = ?
  `;
  await pool.execute(sql, [userId]);
}

/**
 * Check if user account is currently locked.
 */
function isAccountLocked(user) {
  if (!user || !user.locked_until) return false;
  const lockTime = new Date(user.locked_until).getTime();
  return lockTime > Date.now();
}

/**
 * Change user password.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const pool = db.getPool();
  
  // Fetch current hash
  const [rows] = await pool.execute(`SELECT password_hash FROM users WHERE id = ? LIMIT 1`, [userId]);
  if (!rows[0]) {
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isMatch) {
    return { success: false, reason: 'Incorrect current password' };
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]);
  
  return { success: true };
}

module.exports = {
  createStudent,
  findUserByRegisterNo,
  findUserByEmail,
  findUserById,
  verifyPassword,
  recordFailedLogin,
  resetFailedAttempts,
  isAccountLocked,
  changePassword,
};
