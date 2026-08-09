import { query } from '../server/lib/db.js';

async function main() {
  try {
    const res = await query(`
      SELECT id, name, price, currency, billing_cycle, target_type, is_active, is_free, sort_order, created_at
      FROM subscription_plans
      ORDER BY target_type, sort_order, name
    `);
    console.log('=== CURRENT SUBSCRIPTION PLANS IN DB ===');
    console.table(res.rows);

    const dupes = await query(`
      SELECT name, COUNT(*) as count, ARRAY_AGG(target_type) as target_types
      FROM subscription_plans
      GROUP BY name
      HAVING COUNT(*) > 1
    `);
    console.log('=== DUPLICATE PLAN NAMES ===', dupes.rows);

  } catch (err) {
    console.error('Error inspecting plans:', err);
  } finally {
    process.exit(0);
  }
}

main();
