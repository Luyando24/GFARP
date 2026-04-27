import { query } from '../server/lib/db.js';

async function listTables() {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  }
}

listTables();
