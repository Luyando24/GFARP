const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runSubscriptionMigration() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read the subscription schema file
    const schemaPath = path.join(__dirname, '..', 'db', 'subscription_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing subscription schema migration...');
    await client.query(schema);
    console.log('✅ Subscription schema migration completed successfully');

    // Verify the tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('subscription_plans', 'academy_subscriptions', 'subscription_history', 'subscription_payments')
      ORDER BY table_name;
    `);

    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check if default plans were inserted
    const plansResult = await client.query('SELECT name, price, player_limit FROM subscription_plans ORDER BY sort_order');
    console.log('\n📦 Default subscription plans:');
    plansResult.rows.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.price}/month (${plan.player_limit} players)`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️ Tables already exist - this is safe to ignore');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runSubscriptionMigration();