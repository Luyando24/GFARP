import { query } from '../server/lib/db.js';

async function checkSchema() {
  try {
    console.log('--- AGENCIES SCHEMA ---');
    const agencies = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agencies'
      ORDER BY ordinal_position;
    `);
    console.table(agencies.rows);

    console.log('\n--- AGENCY SUBSCRIPTIONS SCHEMA ---');
    const subs = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agency_subscriptions'
      ORDER BY ordinal_position;
    `);
    console.table(subs.rows);
  } catch (err) {
    console.error(err);
  }
}

checkSchema();
