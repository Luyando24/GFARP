import { query } from '../server/lib/db.js';

async function seedIndividualPlans() {
  try {
    console.log('🌱 Seeding Individual Player plans...');

    const plans = [
      {
        name: 'Free Player',
        description: 'Basic profile for visibility',
        price: 0.00,
        currency: 'USD',
        billing_cycle: 'LIFETIME',
        player_limit: 1,
        features: [
          'Public profile page',
          'Basic performance stats',
          'Search visibility'
        ],
        is_active: true,
        is_free: true,
        sort_order: 0,
        target_type: 'INDIVIDUAL'
      },
      {
        name: 'Elite Player',
        description: 'Premium exposure for professional scouts',
        price: 49.99,
        currency: 'USD',
        billing_cycle: 'LIFETIME',
        player_limit: 1,
        features: [
          'All Pro features',
          'Professional highlight reel creation',
          'Scout recommendation engine',
          'Direct contact with agents',
          'Verified career history',
          '1-on-1 career consultation'
        ],
        is_active: true,
        is_free: false,
        sort_order: 2,
        target_type: 'INDIVIDUAL'
      }
    ];

    for (const plan of plans) {
      await query(`
        INSERT INTO subscription_plans (
          name, description, price, currency, billing_cycle, 
          player_limit, features, is_active, is_free, sort_order, target_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          features = EXCLUDED.features,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active;
      `, [
        plan.name, plan.description, plan.price, plan.currency, plan.billing_cycle,
        plan.player_limit, JSON.stringify(plan.features), plan.is_active, plan.is_free,
        plan.sort_order, plan.target_type
      ]);
      console.log(`✅ Seeded plan: ${plan.name}`);
    }

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding individual plans:', error);
  }
}

seedIndividualPlans();
