/**
 * Test Helper for Jest + Supertest
 */

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test_session_secret_for_supertest_testing_32chars';
process.env.CSRF_SECRET = 'test_csrf_secret_for_supertest_testing_32chars';

const request = require('supertest');
const app = require('../server');
const db = require('../src/config/db');
const userService = require('../src/services/userService');
const ticketService = require('../src/services/ticketService');

/**
 * Fetch a valid CSRF token and cookie from the server.
 */
async function getCsrfTokenAndCookie(agent) {
  const res = await agent.get('/api/auth/csrf-token');
  const csrfToken = res.body.csrfToken;
  const cookies = res.headers['set-cookie'] || [];
  return { csrfToken, cookies };
}

/**
 * Reset test database and seed fresh test users & tickets.
 */
async function resetAndSeedDatabase() {
  db.resetMockStore();

  // Create admin user
  const admin = await userService.createStudent({
    name: 'Admin Test',
    registerNo: 'ADMIN_TEST',
    email: 'admin@test.edu',
    department: 'Administration',
    password: 'Password@123',
  });
  // Promote to admin
  const store = db.getMockStore();
  const adminUser = store.users.find((u) => u.id === admin.id);
  if (adminUser) adminUser.role = 'admin';

  // Create Student 1
  const student1 = await userService.createStudent({
    name: 'Student One',
    registerNo: 'STU1001',
    email: 'stu1@test.edu',
    department: 'Computer Science',
    password: 'Password@123',
  });

  // Create Student 2
  const student2 = await userService.createStudent({
    name: 'Student Two',
    registerNo: 'STU1002',
    email: 'stu2@test.edu',
    department: 'Electronics',
    password: 'Password@123',
  });

  // Create sample ticket for student 1
  const ticket1 = await ticketService.createTicket({
    userId: student1.id,
    type: 'grievance',
    category: 'academic',
    subject: 'Issue with Course Registration Portal',
    description: 'The elective portal drops session when selecting deep learning electives.',
    priority: 'high',
  });

  // Create sample resolved ticket for student 1
  const ticket2 = await ticketService.createTicket({
    userId: student1.id,
    type: 'feedback',
    category: 'library',
    subject: 'Request for New Journals in Reading Room',
    description: 'Please add IEEE transaction print copies for senior project research.',
    priority: 'low',
  });
  await ticketService.updateTicketStatusAndRespond({
    ticketId: ticket2.id,
    adminId: admin.id,
    status: 'resolved',
    responseMessage: 'Ordered and subscribed for current academic year.',
  });

  return {
    admin: { ...admin, password: 'Password@123' },
    student1: { ...student1, password: 'Password@123', ticketId: ticket1.id, resolvedTicketId: ticket2.id },
    student2: { ...student2, password: 'Password@123' },
  };
}

module.exports = {
  app,
  request,
  getCsrfTokenAndCookie,
  resetAndSeedDatabase,
};
