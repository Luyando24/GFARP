const { Client } = require('pg');
const DB = 'postgresql://postgres.lpsujzvospfaomgkrcew:ZLUmqmSuFaKrTJ9f@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';

async function testNotifs() {
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const res = await client.query("SELECT to_regclass('public.notifications'), to_regclass('public.user_notifications')");
    console.log('Tables check:', res.rows[0]);
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await client.end();
  }
}

testNotifs();
