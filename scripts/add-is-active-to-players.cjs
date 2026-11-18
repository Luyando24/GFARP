const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
    const migrationPath = path.join(__dirname, '..', 'db', 'add_is_active_to_players.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing is_active column migration for players table...');
    
    // Execute the migration
    const result = await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    console.log('🎉 is_active column added to players table!');

  } catch (error) {
    console.error('❌ Error executing migration:', error);
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Column already exists - this is safe to ignore');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runMigration();