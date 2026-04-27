const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkNullability() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    const cols = await dbClient.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fifa_compliance_documents'
    `);
    console.table(cols.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkNullability();
