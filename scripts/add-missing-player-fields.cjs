const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigration() {
  console.log('🚀 Running migration to add missing player fields...');
  
  // PostgreSQL database configuration for local database
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sofwan_db',
  };
  
  console.log(`🔍 Connecting to PostgreSQL database: ${dbConfig.database}`);
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'db', 'add_missing_player_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: add_missing_player_fields.sql');
    await client.query(migrationSQL);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();