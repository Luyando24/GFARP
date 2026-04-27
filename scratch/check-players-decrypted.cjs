const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const decrypt = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('\\x')) {
    return Buffer.from(value.slice(2), 'hex').toString('utf8');
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  return String(value);
};

async function check() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, first_name_cipher, last_name_cipher, agency_id, academy_id FROM players');
    console.log(`Found ${res.rows.length} players`);
    res.rows.forEach(r => {
      console.log(`ID: ${r.id}, Name: ${decrypt(r.first_name_cipher)} ${decrypt(r.last_name_cipher)}, Agency: ${r.agency_id}, Academy: ${r.academy_id}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
