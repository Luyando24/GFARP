const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function findPlayer() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  const id = 'b0dd40aa-e5a5-4c40-b56c-76909d26d649';

  try {
    const res = await dbClient.query(`SELECT * FROM players WHERE id::text = $1`, [id]);
    if (res.rows.length > 0) {
      console.log('Found in players:', res.rows[0]);
    } else {
      console.log('Not found in players table.');
    }
    
    const indRes = await dbClient.query(`SELECT * FROM individual_players WHERE id::text = $1`, [id]).catch(e => ({rows:[]}));
    if (indRes.rows.length > 0) {
      console.log('Found in individual_players:', indRes.rows[0]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

findPlayer();
