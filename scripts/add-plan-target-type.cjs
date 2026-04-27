const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    console.log('📝 Adding target_type column to subscription_plans...');
    await client.query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'ACADEMY' 
      CHECK (target_type IN ('ACADEMY', 'INDIVIDUAL'));
    `);
    
    console.log('📝 Updating existing plans...');
    await client.query(`
      UPDATE subscription_plans SET target_type = 'ACADEMY' WHERE target_type IS NULL;
    `);

    console.log('✅ Migration executed successfully');
  } catch (error) {
    console.error('❌ Error executing migration:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();
