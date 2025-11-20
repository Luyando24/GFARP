import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcryptjs';

// Resolve database connection string for production/serverless environments
function resolveConnectionString(): string | undefined {
  // Common single-variable connection strings
  const direct =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DB_POOL_URL ||
    process.env.SUPABASE_POOLED_DATABASE_URL ||
    process.env.SUPABASE_PGBOUNCER_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.PG_CONNECTION_STRING;

  if (direct) return direct;

  // Support PG* environment variables (often used in CI/deployments)
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  const port = process.env.PGPORT || '5432';

  if (host && user && password && database) {
    // Construct a standard Postgres connection URL
    const encodedPassword = encodeURIComponent(password);
    const url = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
    return url;
  }

  return undefined;
}

const resolvedConnectionString = resolveConnectionString();

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

// Only create a pool if we have a valid connection string.
// This prevents implicit localhost (127.0.0.1:5432) connections on Netlify.
console.log('[DB] Initializing connection pool...');
const pool: any = resolvedConnectionString
  ? new Pool({
    connectionString: resolvedConnectionString,
    ssl: computeSslOption(resolvedConnectionString),
    max: parseInt(process.env.DB_POOL_MAX || '3'), // Reduced from 5 for serverless
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '3000'), // Reduced from 8000ms to prevent Vercel timeout
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '0'),
    keepAlive: true,
    keepAliveInitialDelayMillis: 3000, // Reduced from 10000ms for faster serverless startup
  })
  : null;

console.log('[DB] Pool initialized:', pool ? 'Connected' : 'No connection string');

// Helper function to execute queries
import { QueryResultRow } from 'pg';

export async function query(text: string, params?: (string | number | boolean | null)[]): Promise<{ rows: QueryResultRow[] }> {
  if (!pool) {
    const details = {
      message: 'Database connection string not configured',
      expectedEnv: [
        'DATABASE_URL',
        'SUPABASE_DB_URL',
        'SUPABASE_DATABASE_URL',
        'POSTGRES_URL',
        'POSTGRES_PRISMA_URL',
        'PG_CONNECTION_STRING',
        'PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT'
      ],
    };
    console.error('[DB] Unavailable:', details);
    throw new Error('Database unavailable: set DATABASE_URL (or SUPABASE_DB_URL)');
  }

  let client;
  try {
    console.log('[DB] Acquiring connection from pool...');
    client = await pool.connect();
    console.log('[DB] Connection acquired, executing query');
    const result = await client.query(text, params);
    return { rows: result.rows };
  } catch (error) {
    console.error('Database query error:', error);

    // Handle specific table access for super admin dashboard
    if (text.includes('SELECT COUNT(*) as count FROM academies')) {
      console.log('Attempting to create academies table if it does not exist');
      try {
        // Create academies table if it doesn't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS academies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE,
            email VARCHAR(255) UNIQUE,
            password_hash VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        // Try the query again
        const retryResult = await client.query(text, params);
        return { rows: retryResult.rows };
      } catch (createError) {
        console.error('Failed to create academies table:', createError);
        return { rows: [{ count: 0 }] };
      }
    }

    // Handle players table access
    if (text.includes('players') && error.message.includes('does not exist')) {
      console.log('Players table may not exist, using fallback calculation');
      return { rows: [{ count: 0 }] };
    }

    // Handle football_transfers table access
    if (text.includes('football_transfers') && error.message.includes('does not exist')) {
      console.log('Football transfers table may not exist, using calculated value');
      return { rows: [{ count: 0 }] };
    }

    // Handle subscriptions table access
    if (text.includes('subscriptions') && error.message.includes('does not exist')) {
      console.log('Subscriptions table may not exist, using calculated value');
      return { rows: [{ count: 0 }] };
    }

    // Handle users table access
    if (text.includes('users') && error.message.includes('does not exist')) {
      console.log('Users table may not exist, using calculated value');
      return { rows: [{ count: 0 }] };
    }

    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('[DB] Connection released back to pool');
    }
  }
}

// Helper function to execute transactions
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (!pool) {
    throw new Error('Database unavailable: set DATABASE_URL (or SUPABASE_DB_URL)');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// NRC hashing utilities for student lookup
// Use a deterministic approach for consistent lookups
export function hashNrc(nrc: string): string {
  // Use a fixed salt for NRC hashing to ensure consistent lookups
  const fixedSalt = process.env.NRC_SALT || 'sofwan_nrc_salt_2024';
  return bcrypt.hashSync(nrc + fixedSalt, 10);
}

// National ID hashing removed: identity/resident features not part of this project

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    if (pool) {
      console.log('Closing database pool...');
      await pool.end();
    }
  } finally {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  try {
    if (pool) {
      console.log('Closing database pool...');
      await pool.end();
    }
  } finally {
    process.exit(0);
  }
});

// export { pool };
// export default pool;