/**
 * Authentication & Account Security Tests
 */

const { app, request, getCsrfTokenAndCookie, resetAndSeedDatabase } = require('./testHelper');

describe('Authentication & Account Security Suite', () => {
  let seededData;

  beforeEach(async () => {
    seededData = await resetAndSeedDatabase();
  });

  describe('Student Registration (/api/auth/register)', () => {
    it('should reject registration if required fields are missing', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const res = await agent
        .post('/api/auth/register')
        .set('x-csrf-token', csrfToken)
        .send({
          name: '',
          registerNo: '',
          email: 'not-an-email',
          department: '',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject passwords that violate the complexity policy', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const res = await agent
        .post('/api/auth/register')
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Jane Doe',
          registerNo: 'STU9999',
          email: 'jane@college.edu',
          department: 'Civil Engineering',
          password: 'alllowercase1', // missing uppercase
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/uppercase/i);
    });

    it('should successfully register a student with valid inputs', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const res = await agent
        .post('/api/auth/register')
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Priya Sharma',
          registerNo: 'STU3001',
          email: 'priya@college.edu',
          department: 'Information Technology',
          password: 'Password@123',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.registerNo).toBe('STU3001');
    });

    it('should reject registration with duplicate register number', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const res = await agent
        .post('/api/auth/register')
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Duplicate Reg',
          registerNo: 'STU1001', // already belongs to Student One
          email: 'unique@college.edu',
          department: 'CSE',
          password: 'Password@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/register number already exists/i);
    });
  });

  describe('Login & Account Lockout (/api/auth/login)', () => {
    it('should log in successfully with valid student credentials', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const res = await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          registerNo: 'STU1001',
          password: 'Password@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.registerNo).toBe('STU1001');
      expect(res.body.user.role).toBe('student');

      // Verify session exists
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.registerNo).toBe('STU1001');
    });

    it('should reject login with wrong password and use generic error', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      const res = await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          registerNo: 'STU1001',
          password: 'WrongPassword999',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid register number or password.');
    });

    it('should lock an account after 5 consecutive failed login attempts', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const failRes = await agent
          .post('/api/auth/login')
          .set('x-csrf-token', csrfToken)
          .send({
            registerNo: 'STU1001',
            password: 'BadPassword123',
          });
        expect(failRes.status).toBe(401);
      }

      // 5th failed attempt triggers lock
      const fifthRes = await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          registerNo: 'STU1001',
          password: 'BadPassword123',
        });
      expect(fifthRes.status).toBe(423);
      expect(fifthRes.body.code).toBe('ACCOUNT_LOCKED');

      // 6th attempt (even with correct password) is blocked by lockout
      const sixthRes = await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          registerNo: 'STU1001',
          password: 'Password@123',
        });
      expect(sixthRes.status).toBe(423);
      expect(sixthRes.body.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('Session Expiry & Logout', () => {
    it('should return 401 when accessing /api/auth/me without an active session', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('should destroy session and clear cookies on logout', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await getCsrfTokenAndCookie(agent);

      // Log in
      await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          registerNo: 'STU1001',
          password: 'Password@123',
        });

      // Log out
      const logoutRes = await agent
        .post('/api/auth/logout')
        .set('x-csrf-token', csrfToken)
        .send({});
      expect(logoutRes.status).toBe(200);

      // Verify subsequent access is unauthenticated
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });
});
