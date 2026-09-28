/**
 * Security Suite: RBAC, CSRF, SQLi, and XSS Protection Tests
 */

const { app, request, getCsrfTokenAndCookie, resetAndSeedDatabase } = require('./testHelper');

describe('Security Suite', () => {
  let seededData;

  beforeEach(async () => {
    seededData = await resetAndSeedDatabase();
  });

  async function loginAs(agent, registerNo, password = 'Password@123') {
    const { csrfToken } = await getCsrfTokenAndCookie(agent);
    await agent
      .post('/api/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ registerNo, password });
    return csrfToken;
  }

  describe('Role-Based Access Control (RBAC)', () => {
    it('should block unauthenticated users from admin routes with 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('should block student accounts from accessing admin endpoints with 403', async () => {
      const studentAgent = request.agent(app);
      await loginAs(studentAgent, 'STU1001');

      // Attempt admin stats
      const statsRes = await studentAgent.get('/api/admin/stats');
      expect(statsRes.status).toBe(403);
      expect(statsRes.body.code).toBe('FORBIDDEN');

      // Attempt admin tickets list
      const ticketsRes = await studentAgent.get('/api/admin/tickets');
      expect(ticketsRes.status).toBe(403);

      // Attempt audit logs
      const auditRes = await studentAgent.get('/api/admin/audit-logs');
      expect(auditRes.status).toBe(403);
    });

    it('should allow admin accounts to access admin endpoints and export CSV', async () => {
      const adminAgent = request.agent(app);
      await loginAs(adminAgent, 'ADMIN_TEST');

      // Admin stats
      const statsRes = await adminAgent.get('/api/admin/stats');
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.summary).toBeDefined();

      // Admin ticket list
      const ticketsRes = await adminAgent.get('/api/admin/tickets');
      expect(ticketsRes.status).toBe(200);
      expect(ticketsRes.body.tickets).toBeDefined();

      // Admin CSV Export
      const exportRes = await adminAgent.get('/api/admin/export');
      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('text/csv');
      expect(exportRes.text).toContain('Ticket Code');
    });
  });

  describe('CSRF Defense', () => {
    it('should reject state-changing requests when CSRF token is missing', async () => {
      const agent = request.agent(app);
      // Notice we do NOT set 'x-csrf-token' header
      const res = await agent.post('/api/auth/register').send({
        name: 'CSRF Attacker',
        registerNo: 'CSRF001',
        email: 'attacker@evil.com',
        department: 'Hacking',
        password: 'Password@123',
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_VALIDATION_FAILED');
    });

    it('should reject state-changing requests with a forged CSRF token', async () => {
      const agent = request.agent(app);
      await getCsrfTokenAndCookie(agent); // gets cookie

      const res = await agent
        .post('/api/auth/login')
        .set('x-csrf-token', 'forged-invalid-token-1234567890abcdef')
        .send({
          registerNo: 'STU1001',
          password: 'Password@123',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_VALIDATION_FAILED');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL Injection payloads in login without authentication bypass', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const maliciousPayloads = [
        "' OR '1'='1",
        "admin' --",
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "\" OR \"\"=\"",
      ];

      for (const payload of maliciousPayloads) {
        const res = await agent
          .post('/api/auth/login')
          .set('x-csrf-token', csrfToken)
          .send({
            registerNo: payload,
            password: 'arbitrary_password',
          });

        // Must reject securely with 401 generic error and NOT crash or grant access
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid register number or password.');
      }
    });

    it('should safely store SQL meta-characters in ticket contents via parameterized statements', async () => {
      const agent = request.agent(app);
      const csrfToken = await loginAs(agent, 'STU1001');

      const sqliSubject = "Student SQL test: '; DROP TABLE tickets; --";
      const res = await agent
        .post('/api/tickets')
        .set('x-csrf-token', csrfToken)
        .send({
          type: 'grievance',
          category: 'infrastructure',
          subject: sqliSubject,
          description: "Testing parameterized query handling of single quotes ' and comments -- in input.",
          priority: 'medium',
        });

      expect(res.status).toBe(201);
      expect(res.body.ticket.subject).toBe(sqliSubject);
    });
  });

  describe('XSS Defense & Input Sanitization', () => {
    it('should handle XSS attack payloads inertly without executing scripts', async () => {
      const agent = request.agent(app);
      const csrfToken = await loginAs(agent, 'STU1001');

      const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
      const res = await agent
        .post('/api/tickets')
        .set('x-csrf-token', csrfToken)
        .send({
          type: 'grievance',
          category: 'other',
          subject: `XSS Test: ${xssPayload}`,
          description: `Payload in description: ${xssPayload}`,
          priority: 'low',
        });

      expect(res.status).toBe(201);
      // The payload is stored safely and returned in JSON
      expect(res.body.ticket.description).toContain('<script>');
    });
  });
});
