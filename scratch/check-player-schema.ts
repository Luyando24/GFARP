import { query } from '../server/lib/db.js';

async function checkPlayerSchema() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'players'
      ORDER BY ordinal_position;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkPlayerSchema();
