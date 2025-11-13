const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { exec } = require('child_process');

async function run() {
  const sqlPath = path.resolve('db', 'system_settings_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  console.log('Applying system_settings schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('System settings schema applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to apply system settings schema:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});