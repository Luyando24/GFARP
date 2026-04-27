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
    const res = await pool.query("SELECT name, target_type FROM subscription_plans WHERE target_type = 'AGENCY'");
    console.log('Filtered plans (AGENCY) in live DB:');
    console.table(res.rows);
    
    const res2 = await pool.query("SELECT name, target_type FROM subscription_plans WHERE target_type = $1", ['AGENCY']);
    console.log('Parameterized filtered plans (AGENCY) in live DB:');
    console.table(res2.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkLiveDb();
