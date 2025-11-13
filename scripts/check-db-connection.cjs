#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  const envLocal = path.resolve(process.cwd(), '.env.local');
  const envFile = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
  }
  if (!process.env.DATABASE_URL && fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

function supabaseSsl(url) {
  return url && /supabase\.co/.test(url) ? { rejectUnauthorized: false } : undefined;
}

(async () => {
  try {
    loadEnv();
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('DATABASE_URL is not set. Define it in .env.local or .env');
      process.exit(1);
    }

    let hostInfo = 'unknown';
    try {
      const u = new URL(url.replace('postgresql://', 'postgres://'));
      hostInfo = `${u.hostname}:${u.port || '5432'}${u.pathname}`;
    } catch {}
    console.log(`Connecting to ${hostInfo}`);

    const client = new Client({ connectionString: url, ssl: supabaseSsl(url) });
    await client.connect();

    const info = await client.query(
      'select current_database() as db, current_user as user, version() as version;'
    );
    console.log(`Connected as ${info.rows[0].user} to ${info.rows[0].db}`);

    const countRes = await client.query(
      "select count(*)::int as cnt from information_schema.tables where table_schema='public';"
    );
    console.log(`Public tables: ${countRes.rows[0].cnt}`);

    const namesRes = await client.query(
      "select table_name from information_schema.tables where table_schema='public' order by table_name limit 50;"
    );
    if (namesRes.rows.length) {
      console.log('Tables:');
      namesRes.rows.forEach((r) => console.log(`- ${r.table_name}`));
    }

    await client.end();
    console.log('Connection check completed.');
  } catch (err) {
    console.error('Connection check failed:', err.message);
    process.exit(1);
  }
})();