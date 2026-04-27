import { query } from '../server/lib/db';

async function test() {
  try {
    const res = await query('SELECT * FROM subscription_plans WHERE id = $1', ['free']);
    console.log('Result:', res.rows);
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Code:', e.code);
  }
}

test();
