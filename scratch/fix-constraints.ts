import { query } from '../server/lib/db.js';

async function fixConstraints() {
  try {
    console.log('Attempting to update target_type constraint...');
    
    // First, try to drop the existing check constraint
    await query(`
      ALTER TABLE subscription_plans 
      DROP CONSTRAINT IF EXISTS subscription_plans_target_type_check;
    `);
    console.log('Dropped old constraint (if it existed)');

    // Add the new constraint including AGENCY
    await query(`
      ALTER TABLE subscription_plans 
      ADD CONSTRAINT subscription_plans_target_type_check 
      CHECK (target_type IN ('ACADEMY', 'INDIVIDUAL', 'AGENCY'));
    `);
    console.log('Added new constraint with AGENCY support');

    // Also update target_type column to have a proper default if needed
    await query(`
      ALTER TABLE subscription_plans 
      ALTER COLUMN target_type SET DEFAULT 'ACADEMY';
    `);

    console.log('Constraint update successful!');
  } catch (err) {
    console.error('Error updating constraints:', err);
  }
}

fixConstraints();
