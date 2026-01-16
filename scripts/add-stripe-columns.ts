import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually since it's not default for dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function addStripeColumns() {
  // Use dynamic import for the db module which is likely ESM
  const { query } = await import('../server/lib/db.js');
  
  console.log('Running Stripe Columns Migration...');
  
  try {
    // Add stripe_customer_id to individual_players if not exists
    console.log('Adding stripe_customer_id to individual_players...');
    await query(`
      ALTER TABLE individual_players 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
    `, []);

    // Add stripe_session_id to player_purchases if not exists
    console.log('Adding stripe_session_id to player_purchases...');
    await query(`
      ALTER TABLE player_purchases 
      ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
    `, []);
    
    // Add unique constraint to stripe_session_id if not exists
    console.log('Adding unique constraint to stripe_session_id...');
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'player_purchases_stripe_session_id_key'
        ) THEN
          ALTER TABLE player_purchases ADD CONSTRAINT player_purchases_stripe_session_id_key UNIQUE (stripe_session_id);
        END IF;
      END
      $$;
    `, []);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

addStripeColumns();
