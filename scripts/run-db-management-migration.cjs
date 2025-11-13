const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Ensure pgcrypto extension for gen_random_uuid()
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '..', 'db', 'database_management_schema.sql');
    const migrationSQL = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing database management schema migration...');
    await client.query(migrationSQL);
    console.log('✅ Database management tables created/updated successfully');

  } catch (error) {
    console.error('❌ Error executing database management migration:', error);
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️ Tables/indexes may already exist - safe to ignore');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();