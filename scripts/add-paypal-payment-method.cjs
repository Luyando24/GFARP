const { Pool } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

// Database configuration using DATABASE_URL like other scripts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addPayPalPaymentMethod() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connected to database');
    
    // Update academy_subscriptions table constraint
    console.log('📝 Updating academy_subscriptions payment method constraint...');
    await client.query(`
      ALTER TABLE academy_subscriptions 
      DROP CONSTRAINT IF EXISTS academy_subscriptions_payment_method_check
    `);
    
    await client.query(`
      ALTER TABLE academy_subscriptions 
      ADD CONSTRAINT academy_subscriptions_payment_method_check 
      CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL'))
    `);
    
    // Update subscription_payments table constraint
    console.log('📝 Updating subscription_payments payment method constraint...');
    await client.query(`
      ALTER TABLE subscription_payments 
      DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check
    `);
    
    await client.query(`
      ALTER TABLE subscription_payments 
      ADD CONSTRAINT subscription_payments_payment_method_check 
      CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL'))
    `);
    
    console.log('✅ Successfully added PAYPAL as a valid payment method');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addPayPalPaymentMethod()
  .then(() => {
    console.log('🏁 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });