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

async function runSqlFile(client, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing: ${filePath}`);
    return;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await client.query(sql);
    console.log(`Applied: ${path.basename(filePath)}`);
  } catch (err) {
    const ignorableCodes = new Set(['42710', '42P07', '23505', '42701', '42P06']);
    if (ignorableCodes.has(err.code)) {
      console.warn(
        `Ignored duplicate/object exists for ${path.basename(filePath)} (code=${err.code})`
      );
    } else {
      console.error(`Error applying ${path.basename(filePath)}: ${err.message}`);
      throw err;
    }
  }
}

(async () => {
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

  // Ensure required extension exists
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  // Ordered migrations (adjust as needed)
  const migrations = [
    path.resolve('db', 'schema.sql'),
    path.resolve('db', 'system_settings_schema.sql'),
    path.resolve('db', 'subscription_schema.sql'),
    path.resolve('db', 'financial_transactions_schema.sql'),
    path.resolve('db', 'stripe_integration_schema.sql'),
    path.resolve('db', 'academy_activation_history.sql'),
    path.resolve('db', 'database_management_schema.sql'),
    path.resolve('db', 'notifications_schema.sql'),
    path.resolve('db', 'support_schema.sql'),
    path.resolve('db', 'add_player_documents_table.sql'),
    path.resolve('db', 'fifa_compliance_schema.sql'),
  ];

  for (const m of migrations) {
    await runSqlFile(client, m);
  }

  console.log('All migrations applied.');

  const countRes = await client.query(
    "select count(*)::int as cnt from information_schema.tables where table_schema='public';"
  );
  console.log(`Public tables after migration: ${countRes.rows[0].cnt}`);

  await client.end();
  console.log('Done.');
})().catch(async (err) => {
  console.error('Migration run failed:', err.message);
  process.exit(1);
});