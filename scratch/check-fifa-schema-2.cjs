const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkSchema() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    const res = await dbClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fifa_compliance'
      ORDER BY ordinal_position
      LIMIT 5
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkSchema();
