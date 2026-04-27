import { query } from '../server/lib/db.js';

async function checkConstraints() {
  try {
    const res = await query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'subscription_plans'::regclass;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkConstraints();
