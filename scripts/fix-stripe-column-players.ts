import { query } from '../server/lib/db.js';

async function fixSchema() {
  console.log('Starting DB schema fix for individual_players...');
  try {
    console.log('Adding stripe_customer_id to individual_players...');
    await query('ALTER TABLE individual_players ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT');
    
    console.log('Successfully updated schema.');
  } catch (err) {
    console.error('Failed to update schema:', err);
  } finally {
    process.exit(0);
  }
}

fixSchema();
