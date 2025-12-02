
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Resolve database connection string
function resolveConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DB_POOL_URL ||
    process.env.SUPABASE_POOLED_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_CONNECTION_STRING
  );
}

// Determine SSL option
function computeSslOption(urlStr: string | undefined): any {
  if (!urlStr) return { rejectUnauthorized: false };
  try {
    const u = new URL(urlStr);
    const host = (u.hostname || '').toLowerCase();
    const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
    const isSupabase = host.includes('supabase') || host.includes('pooler');
    
    if (isSupabase || sslmode === 'require' || process.env.PGSSLMODE === 'require') {
      return { rejectUnauthorized: false };
    }
    return { rejectUnauthorized: false }; // Default to lenient for cloud
  } catch {
    return { rejectUnauthorized: false };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[SETUP] Admin setup request received');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connectionString = resolveConnectionString();
  if (!connectionString) {
    console.error('[SETUP] No database connection string found');
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error: Missing database connection string' 
    });
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Force loose SSL for Vercel/Supabase
  });

  try {
    console.log('[SETUP] Connecting to database...');
    await client.connect();
    console.log('[SETUP] Connected');

    // 1. Create Admin table
    // Note: Using quotes "Admin" to match existing application usage
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "Admin" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'SUPERADMIN')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log('[SETUP] Table "Admin" ensured');

    // Helper to hash
    const hashPassword = async (pwd: string) => bcrypt.hash(pwd, 10);
    const defaultPasswordHash = await hashPassword('admin123');

    // 2. Insert Super Admin
    const upsertSuperAdmin = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, role;
    `;
    
    const superAdminRes = await client.query(upsertSuperAdmin, [
      'admin@gfarp.com',
      defaultPasswordHash,
      'SUPERADMIN',
      'Super',
      'Admin'
    ]);

    // 3. Insert System Admin
    const upsertAdmin = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, role;
    `;

    const adminRes = await client.query(upsertAdmin, [
      'admin@system.com',
      defaultPasswordHash,
      'ADMIN',
      'System',
      'Admin'
    ]);

    return res.status(200).json({
      success: true,
      message: 'Admin setup completed successfully',
      data: {
        superAdmin: superAdminRes.rows[0],
        admin: adminRes.rows[0]
      },
      credentials: {
        superAdmin: { email: 'admin@gfarp.com', password: 'admin123' },
        systemAdmin: { email: 'admin@system.com', password: 'admin123' }
      }
    });

  } catch (error: any) {
    console.error('[SETUP] Database error:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin setup failed',
      error: error.message,
      details: error.toString()
    });
  } finally {
    await client.end().catch(() => {});
  }
}
