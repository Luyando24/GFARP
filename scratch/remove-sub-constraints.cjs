const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function removeConstraints() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    console.log('Dropping foreign key constraints to allow agency subscriptions...');
    
    await dbClient.query('ALTER TABLE subscription_history DROP CONSTRAINT IF EXISTS subscription_history_subscription_id_fkey');
    console.log('Dropped subscription_history_subscription_id_fkey');
    
    await dbClient.query('ALTER TABLE subscription_payments DROP CONSTRAINT IF EXISTS subscription_payments_subscription_id_fkey');
    console.log('Dropped subscription_payments_subscription_id_fkey');
    
    console.log('Constraints removed successfully.');
  } catch (err) {
    console.error('Error removing constraints:', err);
  } finally {
    await dbClient.end();
  }
}

removeConstraints();
