const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

// Database configuration using DATABASE_URL like other scripts
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'db', 'add_transfers_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing transfers table migration...');
    
    // Execute the migration
    const result = await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    console.log('🎉 Transfers table created with sample data!');

  } catch (error) {
    console.error('❌ Error executing migration:', error);
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Table already exists - this is safe to ignore');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runMigration();