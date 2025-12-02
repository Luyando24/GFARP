
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createInitialAdmin() {
  const email = 'admin@sofwan.com';
  const password = 'admin';
  const firstName = 'System';
  const lastName = 'Admin';
  const role = 'SUPERADMIN';

  console.log('Creating initial admin user...');

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Check if Admin table exists by trying to select from it
  // If it doesn't exist, we might need to create it using raw SQL if we had direct access,
  // but with supabase-js we are limited to the API unless we use the RPC or just try to insert.
  // However, supabase-js doesn't support creating tables directly. 
  // The previous `debug-data.ts` used `pg` pool. I should use `pg` for table creation if needed.
  // But wait, the project uses `pg` in `server/lib/db.ts`. I should use that approach if I can.
  
  // Let's try to use the `pg` library directly as the project does.
  // I'll replicate the connection logic from `server/lib/db.ts` but simplified for this script.
}

// Re-write to use 'pg' for full control including table creation
import pg from 'pg';
const { Pool } = pg;

async function run() {
  // Resolve connection string
  const connectionString = 
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('No database connection string found in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // For Supabase
  });

  const client = await pool.connect();

  try {
    console.log('Connected to database.');

    // 1. Create "Admin" table if not exists
    console.log('Ensuring "Admin" table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Check if admin exists
    const email = 'admin@sofwan.com';
    const checkRes = await client.query('SELECT id FROM "Admin" WHERE email = $1', [email]);

    if (checkRes.rows.length > 0) {
      console.log(`Admin user ${email} already exists.`);
    } else {
      // 3. Create admin user
      const password = 'admin';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log(`Creating admin user ${email}...`);
      await client.query(`
        INSERT INTO "Admin" (first_name, last_name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['System', 'Admin', email, hashedPassword, 'SUPERADMIN', true]);
      
      console.log('Admin user created successfully.');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
