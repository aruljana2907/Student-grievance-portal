/**
 * Ticket Lifecycle & Authorization Tests
 */

const { app, request, getCsrfTokenAndCookie, resetAndSeedDatabase } = require('./testHelper');

describe('Ticket Management & Ownership Suite', () => {
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

  it('should allow student to submit a new grievance ticket', async () => {
    const agent = request.agent(app);
    const csrfToken = await loginAs(agent, 'STU1001');

    const res = await agent
      .post('/api/tickets')
      .set('x-csrf-token', csrfToken)
      .send({
        type: 'grievance',
        category: 'hostel',
        subject: 'Hot water geyser not working in Room 204',
        description: 'The geyser in the 2nd-floor washroom trips the breaker whenever switched on.',
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.ticket_code).toMatch(/^GRV-\d{4}-\d{4}$/);
    expect(res.body.ticket.status).toBe('pending');
  });

  it('should allow student to list their own submitted tickets', async () => {
    const agent = request.agent(app);
    await loginAs(agent, 'STU1001');

    const res = await agent.get('/api/tickets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tickets)).toBe(true);
    expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);
    expect(res.body.tickets[0].user_id).toBe(seededData.student1.id);
  });

  it('should allow student to edit their ticket ONLY while it is Pending', async () => {
    const agent = request.agent(app);
    const csrfToken = await loginAs(agent, 'STU1001');

    // 1. Edit Pending Ticket -> Succeeds
    const editRes = await agent
      .put(`/api/tickets/${seededData.student1.ticketId}`)
      .set('x-csrf-token', csrfToken)
      .send({
        type: 'grievance',
        category: 'academic',
        subject: 'Updated: Issue with Course Registration Portal',
        description: 'Updated description: the elective portal still drops the connection.',
        priority: 'urgent',
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.ticket.subject).toContain('Updated:');

    // 2. Edit Resolved Ticket -> Fails with 400
    const failRes = await agent
      .put(`/api/tickets/${seededData.student1.resolvedTicketId}`)
      .set('x-csrf-token', csrfToken)
      .send({
        type: 'feedback',
        category: 'library',
        subject: 'Attempting to edit resolved ticket',
        description: 'This edit should be rejected by server validation.',
        priority: 'low',
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toMatch(/Pending/i);
  });

  it('should allow student to delete their ticket ONLY while it is Pending', async () => {
    const agent = request.agent(app);
    const csrfToken = await loginAs(agent, 'STU1001');

    // 1. Delete Resolved Ticket -> Fails with 400
    const failRes = await agent
      .delete(`/api/tickets/${seededData.student1.resolvedTicketId}`)
      .set('x-csrf-token', csrfToken)
      .send({});

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toMatch(/Pending/i);

    // 2. Delete Pending Ticket -> Succeeds
    const delRes = await agent
      .delete(`/api/tickets/${seededData.student1.ticketId}`)
      .set('x-csrf-token', csrfToken)
      .send({});

    expect(delRes.status).toBe(200);
  });

  it("should BLOCK a student from viewing or editing another student's ticket (IDOR protection)", async () => {
    // Log in as Student Two
    const agent2 = request.agent(app);
    const csrfToken2 = await loginAs(agent2, 'STU1002');

    // Student Two attempts to view Student One's ticket
    const viewRes = await agent2.get(`/api/tickets/${seededData.student1.ticketId}`);
    expect([403, 404]).toContain(viewRes.status);

    // Student Two attempts to edit Student One's ticket
    const editRes = await agent2
      .put(`/api/tickets/${seededData.student1.ticketId}`)
      .set('x-csrf-token', csrfToken2)
      .send({
        type: 'grievance',
        category: 'academic',
        subject: 'Malicious modification of another student ticket',
        description: 'This payload should be rejected due to ownership mismatch.',
      });

    expect([403, 404]).toContain(editRes.status);

    // Student Two attempts to delete Student One's ticket
    const delRes = await agent2
      .delete(`/api/tickets/${seededData.student1.ticketId}`)
      .set('x-csrf-token', csrfToken2)
      .send({});

    expect([403, 404]).toContain(delRes.status);
  });
});
