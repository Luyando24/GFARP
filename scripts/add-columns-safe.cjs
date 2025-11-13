const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function addColumnsSafely() {
  console.log('🚀 Safely adding missing player columns...');
  
  // Use the same configuration as the running server
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Array of columns to add
    const columnsToAdd = [
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS nationality TEXT',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS training_start_date DATE',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS training_end_date DATE',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_phone_cipher BYTEA',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS internal_notes_cipher BYTEA',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS notes_cipher BYTEA'
    ];

    // Add each column safely
    for (const sql of columnsToAdd) {
      try {
        await client.query(sql);
        console.log(`✅ ${sql.split(' ')[5]} added successfully`);
      } catch (error) {
        console.log(`ℹ️  ${sql.split(' ')[5]} might already exist: ${error.message}`);
      }
    }

    console.log('🎉 Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addColumnsSafely();