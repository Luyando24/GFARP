const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findId() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  const id = '71d7fa29-e4df-4e55-95cb-b2da2efe276a';

  try {
    const res = await dbClient.query(`SELECT id FROM agencies WHERE id::text = $1`, [id]);
    console.log('Agencies check:', res.rows.length);
    
    const individualRes = await dbClient.query(`SELECT id FROM individual_players WHERE id::text = $1`, [id]).catch(e => ({rows:[]}));
    console.log('Individual check:', individualRes.rows.length);

  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

findId();
