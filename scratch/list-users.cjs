const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function listUsers() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    const res = await dbClient.query('SELECT id, email, academy_id, role FROM staff_users LIMIT 5');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

listUsers();
