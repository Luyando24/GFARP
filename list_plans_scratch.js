import { query } from './server/lib/db.js';

async function listPlans() {
  try {
    console.log('Fetching all subscription plans...');
    const result = await query('SELECT id, name, target_type, is_active, price FROM subscription_plans');
    console.log('Results:');
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listPlans();
