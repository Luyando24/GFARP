import { query } from '../server/lib/db.js';

async function check() {
  const result = await query('SELECT name, target_type, is_active FROM subscription_plans');
  console.log(JSON.stringify(result.rows, null, 2));
}

check();
