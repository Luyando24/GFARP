const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Disable SSL certificate validation for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load env
const localEnvPath = path.resolve(__dirname, '../.env.local');
const defaultEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
} else {
  dotenv.config();
}

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

const migrations = [
  '20251208000000_blog_schema.sql',
  '20251214000000_update_free_plan_limit.sql',
  '20251214000001_create_financial_view.sql',
  '20251214000002_create_invoices_schema.sql'
];

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  // Handle SSL connection for Supabase/Postgres
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Required for some hosted Postgres like Supabase
  });

  const client = await pool.connect();

  try {
    for (const migrationFile of migrations) {
      const sqlPath = path.resolve(__dirname, '../supabase/migrations', migrationFile);
      
      if (!fs.existsSync(sqlPath)) {
        console.warn(`Warning: Migration file ${migrationFile} not found at ${sqlPath}`);
        continue;
      }

      console.log(`Applying migration: ${migrationFile}...`);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Successfully applied: ${migrationFile}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply ${migrationFile}:`, err.message);
        // Don't exit process, try next migration? 
        // Or stop? Usually stop. But here let's try to proceed if one fails (e.g. if already exists)
        // But for schema creation 'IF NOT EXISTS' handles it. 
        // Let's stop on error to be safe.
        throw err;
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
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
