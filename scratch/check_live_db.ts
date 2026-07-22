import pg from 'pg';
const { Pool } = pg;

async function checkLiveDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running this diagnostic.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
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
