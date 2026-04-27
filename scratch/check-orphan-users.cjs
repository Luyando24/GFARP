const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkUser() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  const academyId = '71d7fa29-e4df-4e55-95cb-b2da2efe276a';
  try {
    const res = await dbClient.query('SELECT * FROM staff_users WHERE academy_id = $1', [academyId]);
    console.log('Users found with this academyId:', res.rows.length);
    if (res.rows.length > 0) {
      console.log('User emails:', res.rows.map(r => r.email));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkUser();
