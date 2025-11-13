const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addAcademyIdToPlayers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'db', 'add_academy_id_to_players.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration to add academy_id column to players table...');
    
    // Execute the migration
    const result = await client.query(migrationSQL);
    console.log('Migration executed successfully');

    // Check if the column was added
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'players' AND column_name = 'academy_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ academy_id column successfully added to players table');
      console.log('Column details:', checkResult.rows[0]);
    } else {
      console.log('❌ academy_id column was not found in players table');
    }

  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

addAcademyIdToPlayers();