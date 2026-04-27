const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAdmin() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  const id = '71d7fa29-e4df-4e55-95cb-b2da2efe276a';
  try {
    const res = await dbClient.query('SELECT * FROM "Admin" WHERE id = $1', [id]);
    console.log('Admin users found with this ID:', res.rows.length);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkAdmin();
