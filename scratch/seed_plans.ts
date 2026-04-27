import { query } from '../server/lib/db.js';
import { v4 as uuidv4 } from 'uuid';

async function seedPlans() {
  console.log('🚀 Starting plan seeding...');

  const plans = [
    // --- ACADEMY PLANS ---
    {
      name: 'Academy Starter',
      description: 'Perfect for small academies getting started.',
      price: 0,
      billing_cycle: 'LIFETIME',
      player_limit: 30,
      storage_limit: 1073741824, // 1GB
      features: JSON.stringify(['Up to 30 players', 'Basic registration', 'Standard support', 'FIFA Compliance basic']),
      is_free: true,
      sort_order: 1,
      target_type: 'ACADEMY'
    },
    {
      name: 'Academy Pro',
      description: 'Professional tools for growing academies.',
      price: 49.99,
      billing_cycle: 'MONTHLY',
      player_limit: 200,
      storage_limit: 10737418240, // 10GB
      features: JSON.stringify(['Up to 200 players', 'Advanced analytics', 'Priority support', 'Full FIFA Compliance', 'Financial tools']),
      is_free: false,
      sort_order: 2,
      target_type: 'ACADEMY'
    },
    {
      name: 'Academy Elite',
      description: 'Unlimited power for top-tier organizations.',
      price: 99.99,
      billing_cycle: 'MONTHLY',
      player_limit: -1, // Unlimited
      storage_limit: 53687091200, // 50GB
      features: JSON.stringify(['Unlimited players', 'Dedicated manager', 'White-label reports', 'Advanced API access', 'Priority 24/7 support']),
      is_free: false,
      sort_order: 3,
      target_type: 'ACADEMY'
    },

    // --- INDIVIDUAL PLAYER PLANS ---
    {
      name: 'Player Basic',
      description: 'Start your professional journey.',
      price: 0,
      billing_cycle: 'LIFETIME',
      player_limit: 1,
      storage_limit: 536870912, // 500MB
      features: JSON.stringify(['Digital resume', 'Public profile', 'Basic stats tracking']),
      is_free: true,
      sort_order: 1,
      target_type: 'INDIVIDUAL'
    },
    {
      name: 'Player Pro',
      description: 'Get noticed by scouts and academies.',
      price: 19.99,
      billing_cycle: 'YEARLY',
      player_limit: 1,
      storage_limit: 5368709120, // 5GB
      features: JSON.stringify(['Video highlight reels', 'Direct scout messaging', 'Verified player badge', 'Advanced performance analytics']),
      is_free: false,
      sort_order: 2,
      target_type: 'INDIVIDUAL'
    },
    {
      name: 'Player Elite',
      description: 'Full career management and maximum exposure.',
      price: 49.99,
      billing_cycle: 'YEARLY',
      player_limit: 1,
      storage_limit: 21474836480, // 20GB
      features: JSON.stringify(['Featured profile placement', 'Legal & transfer guidance', 'Priority support', 'Exclusive trial notifications']),
      is_free: false,
      sort_order: 3,
      target_type: 'INDIVIDUAL'
    },

    // --- AGENCY PLANS ---
    {
      name: 'Agency Boutique',
      description: 'Essential tools for independent agents.',
      price: 149.99,
      billing_cycle: 'MONTHLY',
      player_limit: 50,
      storage_limit: 21474836480, // 20GB
      features: JSON.stringify(['Manage up to 50 players', 'Transfer tracking', 'Document cloud', 'Basic scouting tools']),
      is_free: false,
      sort_order: 1,
      target_type: 'AGENCY'
    },
    {
      name: 'Agency Global',
      description: 'Powerful suite for international agencies.',
      price: 399.99,
      billing_cycle: 'MONTHLY',
      player_limit: 500,
      storage_limit: 107374182400, // 100GB
      features: JSON.stringify(['Manage up to 500 players', 'Advanced scouting filters', 'Commission tracking', 'Sub-agent management', 'Premium support']),
      is_free: false,
      sort_order: 2,
      target_type: 'AGENCY'
    },
    {
      name: 'Agency Enterprise',
      description: 'The ultimate tool for top agencies.',
      price: 999.99,
      billing_cycle: 'MONTHLY',
      player_limit: -1,
      storage_limit: 536870912000, // 500GB
      features: JSON.stringify(['Unlimited players', 'Custom analytics dash', 'Full white-labeling', 'API integrations', 'Dedicated account team']),
      is_free: false,
      sort_order: 3,
      target_type: 'AGENCY'
    }
  ];

  try {
    // Optional: Clear existing plans if needed (but user said they already deleted them)
    // await query('DELETE FROM subscription_plans', []);

    for (const plan of plans) {
      console.log(`Inserting plan: ${plan.name} (${plan.target_type})...`);
      await query(`
        INSERT INTO subscription_plans (
          id, name, description, price, currency, billing_cycle, 
          player_limit, storage_limit, features, is_active, is_free, sort_order, target_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          billing_cycle = EXCLUDED.billing_cycle,
          player_limit = EXCLUDED.player_limit,
          storage_limit = EXCLUDED.storage_limit,
          features = EXCLUDED.features,
          is_active = EXCLUDED.is_active,
          is_free = EXCLUDED.is_free,
          sort_order = EXCLUDED.sort_order,
          target_type = EXCLUDED.target_type,
          updated_at = NOW()
      `, [
        uuidv4(),
        plan.name,
        plan.description,
        plan.price,
        'USD',
        plan.billing_cycle,
        plan.player_limit,
        plan.storage_limit,
        plan.features,
        true,
        plan.is_free,
        plan.sort_order,
        plan.target_type
      ]);
    }

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seedPlans();
