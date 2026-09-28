/**
 * Secure Student Grievance & Feedback Portal
 * Server Entrypoint
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const env = require('./src/config/env');
const { getSessionMiddleware } = require('./src/config/session');
const { generalApiLimiter } = require('./src/middleware/rateLimit');
const { csrfErrorHandler } = require('./src/middleware/csrf');
const { errorHandler } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth');
const ticketRoutes = require('./src/routes/tickets');
const adminRoutes = require('./src/routes/admin');

const app = express();

// Trust reverse proxy if behind nginx/docker
app.set('trust proxy', 1);

// 1. HTTP Security Headers with Strict Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // For Bootstrap inline variables and tooltips
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'data:',
        ],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.COOKIE_SECURE ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Allows CDN resources
  })
);

// 2. CORS configuration (Strict Same-Origin)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 3. Request parsing with body size limits (DoS mitigation)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser(env.SESSION_SECRET));

// 4. Session middleware (MySQL store with 30-min idle timeout)
app.use(getSessionMiddleware());

// 5. Rate limiting on all API routes
app.use('/api/', generalApiLimiter);

// 6. API Route Handlers
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// CSRF error handler middleware for API requests
app.use(csrfErrorHandler);

// 7. Static file serving (HTML, CSS, Vanilla JS, Assets)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Friendly page routing for student and admin sections
app.get('/student', (req, res) => {
  res.sendFile(path.join(publicDir, 'student', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'dashboard.html'));
});

// Friendly error pages
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(publicDir, '404.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
  }
});

// 8. Centralized Error Handler (prevents stack disclosure)
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
  const PORT = env.PORT;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Secure Student Grievance & Feedback Portal`);
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log(`🔒 Environment: ${env.NODE_ENV}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
