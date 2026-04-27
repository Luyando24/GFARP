import { query } from '../server/lib/db.js';

async function checkNullable() {
  try {
    const res = await query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('academy_subscriptions', 'agency_subscriptions', 'subscription_history', 'player_purchases')
      AND column_name IN ('plan_id', 'old_plan_id', 'new_plan_id', 'plan_type');
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkNullable();
