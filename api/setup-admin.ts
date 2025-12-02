
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Helper to extract project ref from Supabase URL
function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    // Format: https://[project-ref].supabase.co
    const parts = u.hostname.split('.');
    if (parts.length > 0) return parts[0];
  } catch {
    return null;
  }
  return null;
}

// Generate fallback connection strings by attempting to fix common configuration errors
function generateSmartFallbacks(originalString: string): string[] {
  const fallbacks: string[] = [];
  const projectRef = getProjectRef();
  
  if (!projectRef) return [];

  try {
    const u = new URL(originalString);
    
    // Fix 1: If connecting to pooler without project ref in username
    // Pattern: postgres@[host] -> postgres.[ref]@[host]
    if (u.hostname.includes('pooler.supabase.com') && !u.username.includes('.')) {
      const u2 = new URL(originalString);
      u2.username = `${u2.username}.${projectRef}`;
      fallbacks.push(u2.toString());
    }

    // Fix 2: Try Direct Connection Host
    // Pattern: [user]:[pass]@[host] -> [user]:[pass]@db.[ref].supabase.co
    // This bypasses the pooler entirely
    const u3 = new URL(originalString);
    u3.hostname = `db.${projectRef}.supabase.co`;
    u3.port = '5432'; // Direct is always 5432
    // Ensure username is clean for direct connection (usually just 'postgres')
    if (u3.username.includes('.')) {
      u3.username = u3.username.split('.')[0];
    }
    fallbacks.push(u3.toString());

  } catch (e) {
    // ignore parsing errors
  }
  
  return fallbacks;
}

// Resolve all potential database connection strings
function getAllConnectionStrings(): string[] {
  const explicitCandidates = [
    process.env.DIRECT_URL, // Prioritize direct connection for setup/DDL
    process.env.SUPABASE_DB_URL,
    process.env.DATABASE_URL,
    process.env.SUPABASE_DB_POOL_URL,
    process.env.SUPABASE_POOLED_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.PG_CONNECTION_STRING
  ].filter(Boolean) as string[];

  // Generate smart fallbacks from the first available candidate
  const smartFallbacks: string[] = [];
  if (explicitCandidates.length > 0) {
    // Use the first candidate to generate variations
    const fallbacks = generateSmartFallbacks(explicitCandidates[0]);
    smartFallbacks.push(...fallbacks);
  }
  
  // Filter out undefined and duplicates
  return [...new Set([...explicitCandidates, ...smartFallbacks])];
}

// Determine appropriate SSL option. Supabase (including pooler.supabase.com)
// requires TLS and can present a certificate chain that breaks strict
// verification in some environments. We relax verification specifically
// for Supabase/pooler hosts and when sslmode=require is present.
function computeSslOption(urlStr: string | undefined): any {
  if (!urlStr) {
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
  }
  try {
    const u = new URL(urlStr);
    const host = (u.hostname || '').toLowerCase();
    const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();

    const isSupabaseHost =
      host.endsWith('supabase.co') ||
      host.endsWith('supabase.com') ||
      host.includes('pooler.supabase.com');

    const envSslRequire = ['require', 'prefer'].includes((process.env.PGSSLMODE || '').toLowerCase())
      || (process.env.DB_SSL === 'true')
      || (process.env.DB_SSL_MODE || '').toLowerCase() === 'require';

    if (isSupabaseHost || sslmode === 'require' || envSslRequire) {
      return { rejectUnauthorized: false };
    }

    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
  } catch {
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
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

  const connectionStrings = getAllConnectionStrings();
  if (connectionStrings.length === 0) {
    console.error('[SETUP] No database connection string found');
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error: Missing database connection string' 
    });
  }

  let client: pg.Client | null = null;
  let lastError: any = null;
  let connected = false;

  // Try each connection string until one works
  for (const connectionString of connectionStrings) {
    // Log connection details (masked)
    try {
      const u = new URL(connectionString);
      console.log(`[SETUP] Attempting connection to host: ${u.hostname}, port: ${u.port}, user: ${u.username}, db: ${u.pathname.slice(1)}`);
    } catch (e) {
      console.log('[SETUP] Connecting to database (url parse failed)');
    }

    // Clean connection string to avoid conflicts with explicit SSL config
    let cleanConnectionString = connectionString;
    try {
      const u = new URL(connectionString);
      if (u.searchParams.has('sslmode')) {
        u.searchParams.delete('sslmode');
        cleanConnectionString = u.toString();
      }
    } catch (e) {
      // ignore
    }

    // For direct connections (port 5432) to Supabase, we MUST use specific SSL settings
    const u = new URL(connectionString);
    const isDirectSupabase = u.port === '5432' && u.hostname.includes('supabase.co');
    
    const clientConfig: pg.ClientConfig = {
      connectionString: cleanConnectionString,
    };

    if (isDirectSupabase) {
      // Supabase direct connections require SSL but can fail with self-signed cert error in some environments
      // We explicitly set rejectUnauthorized: false to allow the connection
      clientConfig.ssl = { rejectUnauthorized: false };
    } else {
      clientConfig.ssl = computeSslOption(connectionString);
    }

    client = new pg.Client(clientConfig);

    try {
      console.log('[SETUP] Connecting...');
      await client.connect();
      console.log('[SETUP] Connected successfully');
      connected = true;
      break; // Stop if connected
    } catch (error: any) {
      const isAuthError = error.message.includes('password authentication failed');
      console.error(`[SETUP] Connection failed for current string: ${error.message}${isAuthError ? ' (Check your password!)' : ''}`);
      lastError = error;
      await client.end().catch(() => {});
      client = null;
    }
  }

  if (!connected || !client) {
    console.error('[SETUP] All connection attempts failed');
    
    // Improve error message for common connection issues
    let errorMessage = lastError?.message || 'Unknown connection error';
    let errorDetails = lastError?.toString() || '';
    
    if (errorMessage.includes('Tenant or user not found')) {
      errorMessage = 'Database connection failed: Tenant or user not found. Please check your database connection string and ensure the project is active.';
    } else if (errorMessage.includes('password authentication failed')) {
      errorMessage = 'Authentication failed. The password in your DATABASE_URL does not match your Supabase database password. Please update your environment variables in Vercel. Note: If your password contains special characters, ensure they are URL-encoded.';
    } else if (errorMessage.includes('ENOTFOUND')) {
      errorMessage = 'Database host not found. This might indicate an incorrect Project Reference or a network issue.';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: lastError?.message,
      details: errorDetails
    });
  }

  try {
    // Force search_path to public to ensure we are in the right schema
    await client.query('SET search_path TO public');

    // 1. Create Admin table
    // Note: Using quotes "Admin" to match existing application usage
    // Ensure we check public schema to avoid tenant confusion
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
    
    // Check if body params are provided
    const { email, password, firstName, lastName } = req.body || {};
    
    if (email && password) {
      // Create custom super admin
      const customPasswordHash = await hashPassword(password);
      const upsertCustomAdmin = `
        INSERT INTO "Admin" (email, password_hash, role, first_name, last_name, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, email, role;
      `;
      
      const customAdminRes = await client.query(upsertCustomAdmin, [
        email,
        customPasswordHash,
        'SUPERADMIN',
        firstName || 'Super',
        lastName || 'Admin'
      ]);
      
      return res.status(200).json({
        success: true,
        message: 'Custom Super Admin created successfully',
        data: {
          superAdmin: customAdminRes.rows[0]
        }
      });
    }

    const defaultPasswordHash = await hashPassword('admin123');

    // 2. Insert Super Admin
    const upsertSuperAdmin = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
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
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
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
    
    // Improve error message for common connection issues
    let errorMessage = error.message;
    let errorDetails = error.toString();
    
    if (errorMessage.includes('Tenant or user not found')) {
      errorMessage = 'Database connection failed: Tenant or user not found. Please check your database connection string and ensure the project is active.';
    } else if (errorMessage.includes('password authentication failed')) {
      errorMessage = 'Database authentication failed. Please check your database credentials.';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: errorDetails
    });
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}
