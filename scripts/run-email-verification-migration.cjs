const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Helper to extract project ref from Supabase URL
function getProjectRef() {
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

function generateSmartFallbacks(originalString) {
  const fallbacks = [];
  const projectRef = getProjectRef();
  
  if (!projectRef) return [];

  try {
    const u = new URL(originalString);
    
    // Fix 1: If connecting to pooler without project ref in username
    if (u.hostname.includes('pooler.supabase.com') && !u.username.includes('.')) {
      const u2 = new URL(originalString);
      u2.username = `${u2.username}.${projectRef}`;
      fallbacks.push(u2.toString());
    }

    // Fix 2: Try Direct Connection Host
    const u3 = new URL(originalString);
    u3.hostname = `db.${projectRef}.supabase.co`;
    u3.port = '5432'; 
    if (u3.username.includes('.')) {
      u3.username = u3.username.split('.')[0];
    }
    fallbacks.push(u3.toString());

  } catch (e) {
    // ignore
  }
  
  return fallbacks;
}

function getAllConnectionStrings() {
  const explicitCandidates = [
    { source: 'DIRECT_URL', value: process.env.DIRECT_URL },
    { source: 'SUPABASE_DB_URL', value: process.env.SUPABASE_DB_URL },
    { source: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { source: 'SUPABASE_DB_POOL_URL', value: process.env.SUPABASE_DB_POOL_URL },
    { source: 'SUPABASE_POOLED_DATABASE_URL', value: process.env.SUPABASE_POOLED_DATABASE_URL },
    { source: 'POSTGRES_URL', value: process.env.POSTGRES_URL },
    { source: 'PG_CONNECTION_STRING', value: process.env.PG_CONNECTION_STRING }
  ].filter(c => !!c.value);

  const smartFallbacks = [];
  if (explicitCandidates.length > 0) {
    const fallbacks = generateSmartFallbacks(explicitCandidates[0].value);
    fallbacks.forEach((fallback, index) => {
      smartFallbacks.push({ source: `SMART_FALLBACK_${index + 1} (from ${explicitCandidates[0].source})`, value: fallback });
    });
  }
  
  const seen = new Set();
  const uniqueResults = [];
  
  [...explicitCandidates, ...smartFallbacks].forEach(item => {
    if (!seen.has(item.value)) {
      seen.add(item.value);
      uniqueResults.push(item);
    }
  });
  
  return uniqueResults;
}

async function runMigration() {
  const candidates = getAllConnectionStrings();
  
  if (candidates.length === 0) {
    console.error('❌ No connection strings found');
    return;
  }

  for (const { source, value } of candidates) {
    console.log(`Trying connection: ${source}...`);
    const client = new Client({
      connectionString: value,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('✅ Connected!');
      
      const sql = `
        ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS verification_token TEXT;
      `;

      console.log('📝 Executing migration...');
      await client.query(sql);
      console.log('✅ Migration executed successfully');
      
      await client.end();
      return; // Success
      
    } catch (error) {
      console.error(`❌ Failed with ${source}: ${error.message}`);
      await client.end();
    }
  }
  
  console.error('❌ All connection attempts failed');
}

runMigration();
