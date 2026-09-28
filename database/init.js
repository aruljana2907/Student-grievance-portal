/**
 * Database Schema Initializer
 * Reads database/schema.sql and executes table creation scripts on MySQL.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function initDatabase() {
  console.log('🔄 Initializing database schema...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found at:', schemaPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(schemaPath, 'utf8');

  let connection;
  try {
    // Connect without selecting DB to ensure DB can be created
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      multipleStatements: true,
    });

    console.log(`Connected to MySQL server at ${env.DB_HOST}:${env.DB_PORT}`);

    await connection.query(sqlContent);
    console.log('✅ Database schema and tables created successfully!');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    console.log('\nTip: Make sure MySQL is running via Docker:');
    console.log('   docker compose up -d');
    console.log('or verify your DB credentials in .env.\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
