const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

// Database configuration using DATABASE_URL
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'db', 'stripe_integration_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing Stripe integration schema migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    console.log('🎉 Stripe columns and indexes created!');

  } catch (error) {
    console.error('❌ Error executing Stripe integration migration:', error);
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️ Columns/indexes may already exist - safe to ignore');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();