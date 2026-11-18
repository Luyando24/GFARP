const { Client } = require('pg');
require('dotenv').config();

async function addIsActiveColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Add is_active column to players table
    console.log('📝 Adding is_active column to players table...');
    await client.query(`
      ALTER TABLE players 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // Add index for better query performance
    console.log('📝 Adding index for is_active column...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_is_active ON players(is_active);
    `);

    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'players' AND column_name = 'is_active';
    `);

    if (result.rows.length > 0) {
      console.log('✅ is_active column added successfully:', result.rows[0]);
    } else {
      console.log('❌ is_active column not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

addIsActiveColumn();