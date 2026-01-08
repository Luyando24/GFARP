const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAcademyId() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, name FROM academies LIMIT 1');
    if (res.rows.length > 0) {
      console.log('Sample Academy:', res.rows[0]);
    } else {
      console.log('No academies found');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAcademyId();
