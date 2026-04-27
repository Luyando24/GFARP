import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

async function listPlans() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    const result = await client.query("SELECT * FROM subscription_plans WHERE target_type = 'INDIVIDUAL'");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

listPlans();
