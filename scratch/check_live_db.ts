import pg from 'pg';
const { Pool } = pg;

async function checkLiveDb() {
  const pool = new Pool({ 
    user: 'postgres.lpsujzvospfaomgkrcew',
    host: 'aws-1-us-east-1.pooler.supabase.com',
    database: 'postgres',
    password: 'ZLUmqmSuFaKrTJ9f',
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    }
  });
  try {
    console.log('Connecting to live DB with config object...');
    const res = await pool.query('SELECT name, target_type, is_active FROM subscription_plans ORDER BY target_type, sort_order');
    console.log('Plans in live DB:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkLiveDb();
