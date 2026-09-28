/**
 * Database Connection Pool Configuration
 * 
 * Uses mysql2/promise for connection pooling and prepared statements.
 * Also provides an in-memory fallback adapter for automated Jest tests or
 * environments where MySQL is not yet booted.
 */

const mysql = require('mysql2/promise');
const env = require('./env');

let pool = null;
let isMock = false;

// Mock database storage for test/offline runner
const mockStore = {
  users: [],
  tickets: [],
  responses: [],
  audit_logs: [],
  sessions: {},
  nextUserId: 1,
  nextTicketId: 1,
  nextResponseId: 1,
  nextAuditId: 1,
};

function resetMockStore() {
  mockStore.users = [];
  mockStore.tickets = [];
  mockStore.responses = [];
  mockStore.audit_logs = [];
  mockStore.sessions = {};
  mockStore.nextUserId = 1;
  mockStore.nextTicketId = 1;
  mockStore.nextResponseId = 1;
  mockStore.nextAuditId = 1;
}

const mockPool = {
  isMock: true,
  reset: resetMockStore,
  getStore: () => mockStore,
  async execute(sql, params = []) {
    return this.query(sql, params);
  },
  async query(sql, params = []) {
    const trimmed = sql.trim().replace(/\s+/g, ' ');

    // 1. SELECT * FROM users WHERE register_no = ?
    if (/SELECT \* FROM users WHERE register_no = \?/i.test(trimmed)) {
      const reg = params[0]?.toUpperCase();
      const user = mockStore.users.find((u) => u.register_no?.toUpperCase() === reg);
      return [user ? [{ ...user }] : []];
    }

    // 2. SELECT * FROM users WHERE email = ?
    if (/SELECT \* FROM users WHERE email = \?/i.test(trimmed)) {
      const email = params[0]?.toLowerCase();
      const user = mockStore.users.find((u) => u.email?.toLowerCase() === email);
      return [user ? [{ ...user }] : []];
    }

    // 3. SELECT ... FROM users WHERE id = ?
    if (/SELECT .* FROM users WHERE id = \?/i.test(trimmed)) {
      const id = parseInt(params[0], 10);
      const user = mockStore.users.find((u) => u.id === id);
      return [user ? [{ ...user }] : []];
    }

    // 4. INSERT INTO users
    if (/INSERT INTO users/i.test(trimmed)) {
      // (role, name, register_no, email, department, password_hash...)
      const id = mockStore.nextUserId++;
      const user = {
        id,
        role: params[0],
        name: params[1],
        register_no: params[2],
        email: params[3],
        department: params[4],
        password_hash: params[5],
        failed_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
      };
      mockStore.users.push(user);
      return [{ insertId: id, affectedRows: 1 }];
    }

    // 5. UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?
    if (/UPDATE users SET failed_attempts = \?, locked_until = \? WHERE id = \?/i.test(trimmed)) {
      const user = mockStore.users.find((u) => u.id === parseInt(params[2], 10));
      if (user) {
        user.failed_attempts = params[0];
        user.locked_until = params[1] ? new Date(params[1]).toISOString() : null;
      }
      return [{ affectedRows: user ? 1 : 0 }];
    }

    // 6. UPDATE users SET failed_attempts = ? WHERE id = ?
    if (/UPDATE users SET failed_attempts = \? WHERE id = \?/i.test(trimmed)) {
      const user = mockStore.users.find((u) => u.id === parseInt(params[1], 10));
      if (user) {
        user.failed_attempts = params[0];
      }
      return [{ affectedRows: user ? 1 : 0 }];
    }

    // 7. UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?
    if (/UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = \?/i.test(trimmed)) {
      const user = mockStore.users.find((u) => u.id === parseInt(params[0], 10));
      if (user) {
        user.failed_attempts = 0;
        user.locked_until = null;
      }
      return [{ affectedRows: user ? 1 : 0 }];
    }

    // 8. UPDATE users SET password_hash = ? WHERE id = ?
    if (/UPDATE users SET password_hash = \? WHERE id = \?/i.test(trimmed)) {
      const user = mockStore.users.find((u) => u.id === parseInt(params[1], 10));
      if (user) {
        user.password_hash = params[0];
      }
      return [{ affectedRows: user ? 1 : 0 }];
    }

    // 9. INSERT INTO tickets
    if (/INSERT INTO tickets/i.test(trimmed)) {
      const id = mockStore.nextTicketId++;
      const ticket = {
        id,
        ticket_code: params[0],
        user_id: parseInt(params[1], 10),
        type: params[2],
        category: params[3],
        subject: params[4],
        description: params[5],
        priority: params[6] || 'medium',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockStore.tickets.push(ticket);
      return [{ insertId: id, affectedRows: 1 }];
    }

    // 10. UPDATE tickets SET ticket_code = ? WHERE id = ?
    if (/UPDATE tickets SET ticket_code = \? WHERE id = \?/i.test(trimmed)) {
      const ticket = mockStore.tickets.find((t) => t.id === parseInt(params[1], 10));
      if (ticket) {
        ticket.ticket_code = params[0];
      }
      return [{ affectedRows: ticket ? 1 : 0 }];
    }

    // 11. SELECT ... FROM tickets WHERE t.user_id = ?
    if (/SELECT .* FROM tickets t .* WHERE t\.user_id = \?/i.test(trimmed)) {
      const userId = parseInt(params[0], 10);
      let list = mockStore.tickets.filter((t) => t.user_id === userId);

      // Check status filter
      if (params.length > 1 && ['pending', 'in_review', 'resolved'].includes(params[1])) {
        list = list.filter((t) => t.status === params[1]);
      }

      const rows = list.map((t) => {
        const resps = mockStore.responses.filter((r) => r.ticket_id === t.id);
        const latestResp = resps.length > 0 ? resps[resps.length - 1] : null;
        return {
          ...t,
          latest_response: latestResp?.message || null,
          response_date: latestResp?.created_at || null,
        };
      });
      return [rows];
    }

    // 12. SELECT ... FROM tickets WHERE t.id = ?
    if (/SELECT .* FROM tickets t .* WHERE t\.id = \?/i.test(trimmed)) {
      const id = parseInt(params[0], 10);
      const ticket = mockStore.tickets.find((t) => t.id === id);
      if (!ticket) return [[]];

      const user = mockStore.users.find((u) => u.id === ticket.user_id);
      return [
        [
          {
            ...ticket,
            student_name: user?.name || 'Unknown',
            student_register_no: user?.register_no || '',
            student_email: user?.email || '',
            student_department: user?.department || '',
          },
        ],
      ];
    }

    // 13. SELECT ... FROM responses WHERE r.ticket_id = ?
    if (/SELECT .* FROM responses r .* WHERE r\.ticket_id = \?/i.test(trimmed)) {
      const ticketId = parseInt(params[0], 10);
      const resps = mockStore.responses
        .filter((r) => r.ticket_id === ticketId)
        .map((r) => {
          const admin = mockStore.users.find((u) => u.id === r.admin_id);
          return {
            ...r,
            admin_name: admin?.name || 'Admin',
          };
        });
      return [resps];
    }

    // 14. UPDATE tickets SET subject = ?, description = ? ...
    if (/UPDATE tickets SET subject = \?, description = \?/i.test(trimmed)) {
      const ticketId = parseInt(params[5], 10);
      const userId = parseInt(params[6], 10);
      const ticket = mockStore.tickets.find((t) => t.id === ticketId && t.user_id === userId && t.status === 'pending');
      if (ticket) {
        ticket.subject = params[0];
        ticket.description = params[1];
        ticket.category = params[2];
        ticket.type = params[3];
        ticket.priority = params[4];
        ticket.updated_at = new Date().toISOString();
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // 15. DELETE FROM tickets WHERE id = ? AND user_id = ? AND status = 'pending'
    if (/DELETE FROM tickets WHERE id = \? AND user_id = \? AND status = 'pending'/i.test(trimmed)) {
      const ticketId = parseInt(params[0], 10);
      const userId = parseInt(params[1], 10);
      const idx = mockStore.tickets.findIndex((t) => t.id === ticketId && t.user_id === userId && t.status === 'pending');
      if (idx !== -1) {
        mockStore.tickets.splice(idx, 1);
        mockStore.responses = mockStore.responses.filter((r) => r.ticket_id !== ticketId);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // 16. Admin: UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?
    if (/UPDATE tickets SET status = \?, updated_at = NOW\(\) WHERE id = \?/i.test(trimmed)) {
      const status = params[0];
      const ticketId = parseInt(params[1], 10);
      const ticket = mockStore.tickets.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.status = status;
        ticket.updated_at = new Date().toISOString();
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // 17. INSERT INTO responses
    if (/INSERT INTO responses/i.test(trimmed)) {
      const id = mockStore.nextResponseId++;
      const resp = {
        id,
        ticket_id: parseInt(params[0], 10),
        admin_id: parseInt(params[1], 10),
        message: params[2],
        created_at: new Date().toISOString(),
      };
      mockStore.responses.push(resp);
      return [{ insertId: id, affectedRows: 1 }];
    }

    // 18. Admin: COUNT(*) FROM tickets
    if (/SELECT COUNT\(\*\) as total FROM tickets/i.test(trimmed)) {
      let filtered = [...mockStore.tickets];
      if (params.length > 0) {
        // Apply status or category if present in params
        if (['pending', 'in_review', 'resolved'].includes(params[0])) {
          filtered = filtered.filter((t) => t.status === params[0]);
        }
      }
      return [[{ total: filtered.length }]];
    }

    // 19. Admin: SELECT ... FROM tickets t JOIN users u
    if (/SELECT .* FROM tickets t JOIN users u ON t\.user_id = u\.id/i.test(trimmed)) {
      const rows = mockStore.tickets.map((t) => {
        const u = mockStore.users.find((usr) => usr.id === t.user_id);
        const resps = mockStore.responses.filter((r) => r.ticket_id === t.id);
        const latestResp = resps.length > 0 ? resps[resps.length - 1] : null;
        const respAdmin = latestResp ? mockStore.users.find((usr) => usr.id === latestResp.admin_id) : null;
        return {
          ...t,
          student_name: u?.name || 'Student',
          student_register_no: u?.register_no || '',
          student_department: u?.department || '',
          latest_response: latestResp?.message || null,
          responder_name: respAdmin?.name || null,
        };
      });
      return [rows];
    }

    // 20. Admin stats queries
    if (/SELECT status, COUNT\(\*\) as count FROM tickets GROUP BY status/i.test(trimmed)) {
      const counts = { pending: 0, in_review: 0, resolved: 0 };
      mockStore.tickets.forEach((t) => {
        if (counts[t.status] !== undefined) counts[t.status]++;
      });
      const rows = Object.entries(counts).map(([status, count]) => ({ status, count }));
      return [rows];
    }

    if (/SELECT category, COUNT\(\*\) as count FROM tickets GROUP BY category/i.test(trimmed)) {
      const counts = {};
      mockStore.tickets.forEach((t) => {
        counts[t.category] = (counts[t.category] || 0) + 1;
      });
      const rows = Object.entries(counts).map(([category, count]) => ({ category, count }));
      return [rows];
    }

    if (/SELECT .* as month, COUNT\(\*\) as count FROM tickets/i.test(trimmed)) {
      const month = new Date().toISOString().substring(0, 7);
      return [[{ month, count: mockStore.tickets.length }]];
    }

    if (/SELECT COUNT\(\*\) as total_tickets/i.test(trimmed)) {
      const total_tickets = mockStore.tickets.length;
      const pending_count = mockStore.tickets.filter((t) => t.status === 'pending').length;
      const in_review_count = mockStore.tickets.filter((t) => t.status === 'in_review').length;
      const resolved_count = mockStore.tickets.filter((t) => t.status === 'resolved').length;
      const grievance_count = mockStore.tickets.filter((t) => t.type === 'grievance').length;
      const feedback_count = mockStore.tickets.filter((t) => t.type === 'feedback').length;
      return [
        [
          {
            total_tickets,
            pending_count,
            in_review_count,
            resolved_count,
            grievance_count,
            feedback_count,
          },
        ],
      ];
    }

    // 21. INSERT INTO audit_logs
    if (/INSERT INTO audit_logs/i.test(trimmed)) {
      const id = mockStore.nextAuditId++;
      const log = {
        id,
        user_id: params[0] || null,
        action: params[1],
        ip: params[2],
        user_agent: params[3],
        created_at: new Date().toISOString(),
      };
      mockStore.audit_logs.push(log);
      return [{ insertId: id, affectedRows: 1 }];
    }

    // 22. SELECT ... FROM audit_logs
    if (/SELECT .* FROM audit_logs/i.test(trimmed)) {
      const rows = mockStore.audit_logs.map((a) => {
        const u = mockStore.users.find((usr) => usr.id === a.user_id);
        return {
          ...a,
          user_name: u?.name || null,
          user_email: u?.email || null,
          user_role: u?.role || null,
        };
      });
      return [rows];
    }

    // Fallback default
    return [[]];
  },
  async end() {
    return Promise.resolve();
  },
};

function createRealPool() {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    queueLimit: 0,
    dateStrings: true,
  });
}

function getPool() {
  if (pool) return pool;

  if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB === 'true') {
    isMock = true;
    pool = mockPool;
    return pool;
  }

  try {
    pool = createRealPool();
    return pool;
  } catch (err) {
    console.warn('[Database] MySQL connection failed. Falling back to in-memory adapter:', err.message);
    isMock = true;
    pool = mockPool;
    return pool;
  }
}

function setMockMode(active = true) {
  isMock = active;
  pool = active ? mockPool : null;
}

module.exports = {
  getPool,
  setMockMode,
  resetMockStore,
  getMockStore: () => mockStore,
};
