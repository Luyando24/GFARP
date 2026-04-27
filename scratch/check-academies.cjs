const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAcademies() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    const cols = await dbClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'academies'
    `);
    console.table(cols.rows);

    const data = await dbClient.query('SELECT id, name FROM academies LIMIT 5');
    console.log('Sample Academies:');
    console.table(data.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkAcademies();
