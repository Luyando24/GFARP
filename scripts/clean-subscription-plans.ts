import { query } from '../server/lib/db.js';
import { v4 as uuidv4 } from 'uuid';

async function cleanSubscriptionPlans() {
  console.log('=== Cleaning and Deduplicating Subscription Plans ===');

  try {
    // 1. Ensure Player Free plan exists for INDIVIDUAL target type
    const freePlayerCheck = await query(
      `SELECT id FROM subscription_plans WHERE target_type = 'INDIVIDUAL' AND is_free = true`
    );

    if (freePlayerCheck.rows.length === 0) {
      console.log('Adding missing "Player Free" plan for INDIVIDUAL target type...');
      await query(`
        INSERT INTO subscription_plans (
          id, name, description, price, currency, billing_cycle,
          player_limit, storage_limit, features, is_active, is_free, sort_order, target_type,
          created_at, updated_at
        ) VALUES (
          $1, 'Player Free', 'Basic player profile and public link', 0.00, 'USD', 'LIFETIME',
          1, 536870912, '["Basic player profile", "Public profile link"]'::jsonb, true, true, 0, 'INDIVIDUAL',
          NOW(), NOW()
        )
      `, [uuidv4()]);
    }

    // 2. Deactivate duplicate plans that were seeded with legacy/generic names
    // For ACADEMY: keep 'Academy Starter', 'Academy Pro', 'Academy Elite' as primary active plans.
    // Deactivate generic 'Free Plan', 'Pro Plan', 'Elite Plan' if Academy Starter / Academy Pro / Academy Elite exist.
    const academyStarter = await query(`SELECT id FROM subscription_plans WHERE name = 'Academy Starter' AND target_type = 'ACADEMY'`);
    if (academyStarter.rows.length > 0) {
      await query(`UPDATE subscription_plans SET is_active = false WHERE name = 'Free Plan' AND target_type = 'ACADEMY'`);
    }

    const academyPro = await query(`SELECT id FROM subscription_plans WHERE name = 'Academy Pro' AND target_type = 'ACADEMY'`);
    if (academyPro.rows.length > 0) {
      await query(`UPDATE subscription_plans SET is_active = false WHERE name = 'Pro Plan' AND target_type = 'ACADEMY'`);
    }

    const academyElite = await query(`SELECT id FROM subscription_plans WHERE name = 'Academy Elite' AND target_type = 'ACADEMY'`);
    if (academyElite.rows.length > 0) {
      await query(`UPDATE subscription_plans SET is_active = false WHERE name = 'Elite Plan' AND target_type = 'ACADEMY'`);
    }

    // For AGENCY: keep 'Basic Agency' / 'Agency Starter', 'Agency Pro', 'Agency Enterprise' as primary active plans.
    // Deactivate duplicate 'Agency Boutique', 'Agency Global' or 'Professional Agency' if clean set exists.
    const agencyEnterprise = await query(`SELECT id FROM subscription_plans WHERE name = 'Agency Enterprise' AND target_type = 'AGENCY'`);
    if (agencyEnterprise.rows.length > 0) {
      await query(`UPDATE subscription_plans SET is_active = false WHERE name = 'Enterprise Agency' AND target_type = 'AGENCY'`);
    }

    // Print resulting active plans table
    const result = await query(`
      SELECT id, name, price, currency, billing_cycle, target_type, is_active, is_free, sort_order
      FROM subscription_plans
      WHERE is_active = true
      ORDER BY target_type, sort_order, price ASC
    `);

    console.log('=== ACTIVE SUBSCRIPTION PLANS AFTER DEDUPLICATION ===');
    console.table(result.rows);

  } catch (error) {
    console.error('Error cleaning subscription plans:', error);
  } finally {
    process.exit(0);
  }
}

cleanSubscriptionPlans();
