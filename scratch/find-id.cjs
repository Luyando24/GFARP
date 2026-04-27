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
    const tables = ['academies', 'staff_users', 'players', 'transfers', 'fifa_compliance', '"Admin"'];
    for (const table of tables) {
      const res = await dbClient.query(`SELECT * FROM ${table} WHERE id::text = $1 OR (table_name = 'players' AND academy_id::text = $1)`, [id]).catch(e => ({rows:[]}));
      if (res.rows.length > 0) {
        console.log(`Found in ${table}:`, res.rows.length, 'records');
      }
    }
    
    // Check if it's a foreign key somewhere else
    const academiesRes = await dbClient.query(`SELECT id FROM academies WHERE id::text = $1`, [id]);
    console.log('Academies check:', academiesRes.rows.length);

  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

findId();
