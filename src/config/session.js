/**
 * Session Configuration with MySQL Store
 * 
 * SECURITY:
 * - httpOnly: true (prevents client-side script access to session cookie)
 * - sameSite: 'strict' (mitigates CSRF on cross-site requests)
 * - secure: dynamic (true in production HTTPS)
 * - maxAge: 30 minutes idle timeout
 * - rolling: true (resets cookie expiry on active interaction)
 */

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const env = require('./env');

function getSessionMiddleware() {
  let store;

  if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB === 'true') {
    // In-memory store for isolated Jest test suites
    store = new session.MemoryStore();
  } else {
    // MySQL persistent store for production & local dev
    const dbOptions = {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data',
        },
      },
    };

    try {
      store = new MySQLStore(dbOptions);
      store.on('error', (err) => {
        console.warn('[Session Store Warning]:', err.message);
      });
    } catch (err) {
      console.warn('[Session Store] Falling back to MemoryStore:', err.message);
      store = new session.MemoryStore();
    }
  }

  return session({
    name: 'sgp_session_id',
    secret: env.SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset 30-minute idle timer on each valid request
    cookie: {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000, // 30 minutes
      path: '/',
    },
  });
}

module.exports = {
  getSessionMiddleware,
};
