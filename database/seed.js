/**
 * Database Seed Script
 * 
 * Creates:
 * 1. Administrator Account: admin@college.edu / Admin@123
 * 2. Demo Student Account:  110725105034 / Student@123
 * 3. 8 Realistic Tickets spanning all statuses (Pending, In Review, Resolved)
 * 4. Realistic Admin Responses for In Review and Resolved tickets
 * 5. Initial Audit Log records
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const BCRYPT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting database seed process...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      multipleStatements: true,
    });

    console.log(`Connected to MySQL database [${env.DB_NAME}]`);

    // Disable foreign key checks for clean truncation/refresh
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE responses');
    await connection.query('TRUNCATE TABLE tickets');
    await connection.query('TRUNCATE TABLE audit_logs');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🧹 Cleaned existing records.');

    // 1. Create Admin & Student password hashes
    const adminPasswordHash = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);
    const studentPasswordHash = await bcrypt.hash('Student@123', BCRYPT_ROUNDS);

    // Insert Admin
    const [adminResult] = await connection.execute(
      `INSERT INTO users (role, name, register_no, email, department, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      ['admin', 'Dean of Student Affairs', 'ADMIN001', 'admin@college.edu', 'Administration', adminPasswordHash]
    );
    const adminId = adminResult.insertId;
    console.log(`👤 Created Admin user (ID: ${adminId})`);

    // Insert Student
    const [studentResult] = await connection.execute(
      `INSERT INTO users (role, name, register_no, email, department, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      ['student', 'Janani A', '110725105034', 'student@college.edu', 'Computer Science and Engineering', studentPasswordHash]
    );
    const studentId = studentResult.insertId;
    console.log(`🎓 Created Student user (ID: ${studentId})`);

    // 2. Define 8 Sample Tickets
    const sampleTickets = [
      {
        code: 'GRV-2026-0001',
        type: 'grievance',
        category: 'infrastructure',
        subject: 'Air Conditioning in Lab 3 Not Functioning',
        description: 'During the afternoon practical sessions in CSE Lab 3, both AC units malfunction, causing high temperatures and server fan throttling.',
        priority: 'high',
        status: 'pending',
        daysAgo: 1,
        response: null,
      },
      {
        code: 'FBK-2026-0002',
        type: 'feedback',
        category: 'library',
        subject: 'Request for Additional Cloud Computing Reference Books',
        description: 'The current curriculum covers Docker, Kubernetes, and Cloud Security. It would greatly benefit final-year students if 5 additional copies of the latest AWS and GCP certification guides were acquired.',
        priority: 'medium',
        status: 'in_review',
        daysAgo: 3,
        response: 'The Head Librarian has reviewed this proposal. We are forwarding the recommended ISBN list to the book procurement committee for the upcoming quarter.',
      },
      {
        code: 'GRV-2026-0003',
        type: 'grievance',
        category: 'hostel',
        subject: 'Intermittent Wi-Fi Connectivity in Block B (3rd Floor)',
        description: 'The access point near Room 314 disconnects every 15-20 minutes, interrupting project work and online assessments.',
        priority: 'high',
        status: 'resolved',
        daysAgo: 5,
        response: 'IT Services inspected the access point on Floor 3 and replaced the faulty PoE injector. Signal levels have been re-calibrated and connection logs verify normal operation.',
      },
      {
        code: 'FBK-2026-0004',
        type: 'feedback',
        category: 'canteen',
        subject: 'Healthy Breakfast Options in Main Cafeteria',
        description: 'Could the cafeteria provide fresh seasonal fruits, oats, and boiled eggs during the 7:30 AM to 9:00 AM breakfast slot?',
        priority: 'low',
        status: 'resolved',
        daysAgo: 7,
        response: 'Food & Nutrition Committee spoke with the catering contractor. A fresh fruit and healthy breakfast counter has been inaugurated starting this Monday.',
      },
      {
        code: 'GRV-2026-0005',
        type: 'grievance',
        category: 'transportation',
        subject: 'Bus Route 12 Repeated Morning Delays',
        description: 'Bus #12 from Central Station has arrived 20 minutes late on Tuesday and Thursday, causing students to miss first-period roll call.',
        priority: 'medium',
        status: 'in_review',
        daysAgo: 2,
        response: 'Transport supervisor has coordinated with the driver to bypass the ongoing metro construction bottleneck via the alternate ring road.',
      },
      {
        code: 'GRV-2026-0006',
        type: 'grievance',
        category: 'examination',
        subject: 'Clash in End-Semester Elective Timetable',
        description: 'The elective exams for Distributed Systems and Machine Learning are currently scheduled on the same slot (October 14th afternoon).',
        priority: 'urgent',
        status: 'resolved',
        daysAgo: 8,
        response: 'Controller of Examinations has verified the overlap and re-scheduled the Distributed Systems paper to October 16th. A revised timetable notification has been issued.',
      },
      {
        code: 'FBK-2026-0007',
        type: 'feedback',
        category: 'academic',
        subject: 'Hands-on Workshop on Microservices Architecture',
        description: 'Students in semesters 6 and 8 would find a weekend industry workshop on microservices and API gateways very helpful for capstone projects.',
        priority: 'medium',
        status: 'pending',
        daysAgo: 0,
        response: null,
      },
      {
        code: 'GRV-2026-0008',
        type: 'grievance',
        category: 'infrastructure',
        subject: 'Flickering Projector in Seminar Hall 2',
        description: 'The HDMI projector display flickers violently and drops audio intermittently during technical presentations.',
        priority: 'low',
        status: 'pending',
        daysAgo: 0,
        response: null,
      },
    ];

    for (const t of sampleTickets) {
      const [ticketResult] = await connection.execute(
        `INSERT INTO tickets (ticket_code, user_id, type, category, subject, description, priority, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), NOW())`,
        [t.code, studentId, t.type, t.category, t.subject, t.description, t.priority, t.status, t.daysAgo]
      );
      const ticketId = ticketResult.insertId;

      if (t.response) {
        await connection.execute(
          `INSERT INTO responses (ticket_id, admin_id, message, created_at)
           VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [ticketId, adminId, t.response, Math.max(0, t.daysAgo - 1)]
        );
      }
    }

    console.log(`📋 Inserted ${sampleTickets.length} sample tickets with admin responses.`);

    // 3. Seed Audit Logs
    const auditEvents = [
      { userId: null, action: 'SYSTEM_SEEDED', ip: '127.0.0.1', userAgent: 'SeedScript/1.0' },
      { userId: adminId, action: 'ADMIN_SEEDED', ip: '127.0.0.1', userAgent: 'SeedScript/1.0' },
      { userId: studentId, action: 'STUDENT_SEEDED', ip: '127.0.0.1', userAgent: 'SeedScript/1.0' },
      { userId: studentId, action: 'LOGIN_SUCCESS', ip: '192.168.1.105', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      { userId: adminId, action: 'STATUS_CHANGE:RESOLVED', ip: '192.168.1.20', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    ];

    for (const evt of auditEvents) {
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [evt.userId, evt.action, evt.ip, evt.userAgent]
      );
    }
    console.log(`🛡️ Seeded ${auditEvents.length} initial audit logs.`);

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Admin Credentials:');
    console.log('   Register / ID : ADMIN001 (or Email: admin@college.edu)');
    console.log('   Password      : Admin@123\n');
    console.log('Student Credentials:');
    console.log('   Register No   : 110725105034 (or Email: student@college.edu)');
    console.log('   Password      : Student@123');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
