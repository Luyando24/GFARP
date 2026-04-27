import { query } from '../server/lib/db.js';

async function fixSchema() {
  console.log('Starting DB schema fix...');
  try {
    console.log('Adding stripe_customer_id to academies...');
    await query('ALTER TABLE academies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT');
    
    console.log('Adding stripe_customer_id to agencies...');
    await query('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT');
    
    console.log('Successfully updated schema.');
  } catch (err) {
    console.error('Failed to update schema:', err);
  } finally {
    process.exit(0);
  }
}

fixSchema();
