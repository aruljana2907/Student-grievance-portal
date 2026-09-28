/**
 * Authentication Controller
 * 
 * Handles registration, login, logout, session management, CSRF issuance,
 * and account security policies.
 */

const userService = require('../services/userService');
const auditService = require('../services/auditService');
const { generateToken } = require('../middleware/csrf');
const { getClientIp, getUserAgent } = require('../utils/audit');

/**
 * Return CSRF token to frontend client and set double-submit cookie.
 */
function getCsrfToken(req, res) {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
}

/**
 * Register a new student account.
 */
async function register(req, res, next) {
  const { name, registerNo, email, department, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // Check if register number or email already in use
    const existingByReg = await userService.findUserByRegisterNo(registerNo);
    if (existingByReg) {
      return res.status(400).json({
        error: 'An account with this register number already exists.',
        field: 'registerNo',
      });
    }

    const existingByEmail = await userService.findUserByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({
        error: 'An account with this email address already exists.',
        field: 'email',
      });
    }

    const newUser = await userService.createStudent({
      name,
      registerNo,
      email,
      department,
      password,
    });

    await auditService.logEvent({
      userId: newUser.id,
      action: 'STUDENT_REGISTERED',
      ip,
      userAgent,
    });

    res.status(201).json({
      message: 'Registration successful! You may now sign in.',
      user: newUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login handler with account lockout & session regeneration.
 */
async function login(req, res, next) {
  const { registerNo, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // Check by register number or email
    let user = await userService.findUserByRegisterNo(registerNo);
    if (!user && registerNo.includes('@')) {
      user = await userService.findUserByEmail(registerNo);
    }

    // Generic error to prevent username/email harvesting
    const genericAuthError = 'Invalid register number or password.';

    if (!user) {
      await auditService.logEvent({
        userId: null,
        action: `LOGIN_FAILED_UNKNOWN_USER:${registerNo.substring(0, 30)}`,
        ip,
        userAgent,
      });
      return res.status(401).json({ error: genericAuthError });
    }

    // Check account lockout
    if (userService.isAccountLocked(user)) {
      await auditService.logEvent({
        userId: user.id,
        action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
        ip,
        userAgent,
      });
      return res.status(423).json({
        error: 'Account is temporarily locked due to multiple failed login attempts. Please try again after 5 minutes.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    // Verify password with bcrypt
    const isPasswordValid = await userService.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      const { attempts, isLocked } = await userService.recordFailedLogin(user.id, user.failed_attempts);
      await auditService.logEvent({
        userId: user.id,
        action: `LOGIN_FAILED_ATTEMPT_${attempts}`,
        ip,
        userAgent,
      });

      if (isLocked) {
        return res.status(423).json({
          error: 'Account locked due to 5 consecutive failed attempts. Please try again after 5 minutes.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      return res.status(401).json({ error: genericAuthError });
    }

    // Successful login: reset failed attempts
    await userService.resetFailedAttempts(user.id);

    // SECURITY: Regenerate session to prevent Session Fixation attacks
    req.session.regenerate((sessionErr) => {
      if (sessionErr) {
        return next(sessionErr);
      }

      req.session.user = {
        id: user.id,
        role: user.role,
        name: user.name,
        registerNo: user.register_no,
        email: user.email,
        department: user.department,
      };

      auditService.logEvent({
        userId: user.id,
        action: `LOGIN_SUCCESS:${user.role.toUpperCase()}`,
        ip,
        userAgent,
      });

      res.json({
        message: 'Login successful',
        user: req.session.user,
      });
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout handler with full session destruction.
 */
function logout(req, res, next) {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  const userId = req.session?.user?.id || null;

  if (userId) {
    auditService.logEvent({
      userId,
      action: 'LOGOUT',
      ip,
      userAgent,
    });
  }

  // Destroy session from store
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('sgp_session_id', { path: '/' });
    res.clearCookie('sgp_csrf', { path: '/' });
    res.json({ message: 'Logged out successfully.' });
  });
}

/**
 * Get current authenticated user profile.
 */
function getCurrentUser(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  res.json({ user: req.session.user });
}

/**
 * Change student / admin password.
 */
async function changePassword(req, res, next) {
  const userId = req.session.user.id;
  const { currentPassword, newPassword } = req.body;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    const result = await userService.changePassword(userId, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.reason || 'Failed to update password.' });
    }

    await auditService.logEvent({
      userId,
      action: 'PASSWORD_CHANGED',
      ip,
      userAgent,
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCsrfToken,
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
};
