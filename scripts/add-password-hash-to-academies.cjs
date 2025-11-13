const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Database configuration using DATABASE_URL like other scripts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addPasswordHashColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding password_hash column to academies table...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'db', 'add_password_hash_to_academies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Successfully added password_hash column to academies table');
    
    // Check if column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'academies' AND column_name = 'password_hash'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verification successful:', result.rows[0]);
    } else {
      console.log('❌ Column verification failed - password_hash column not found');
    }
    
  } catch (error) {
    console.error('❌ Error adding password_hash column:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addPasswordHashColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });