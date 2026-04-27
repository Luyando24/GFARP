import { query } from '../server/lib/db.js';

async function seedAgencyPlans() {
  try {
    console.log('🌱 Seeding Agency plans...');

    const plans = [
      {
        name: 'Basic Agency',
        description: 'For boutique agencies and individual agents',
        price: 99.99,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        player_limit: 10,
        features: [
          'Manage up to 10 players',
          'Professional player profiles',
          'Agency public feature page',
          'Basic document storage',
          'Email support'
        ],
        is_active: true,
        is_free: false,
        sort_order: 0,
        target_type: 'AGENCY'
      },
      {
        name: 'Pro Agency',
        description: 'For growing professional agencies',
        price: 299.99,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        player_limit: 100,
        features: [
          'Manage up to 100 players',
          'Elite player profiles with video',
          'Premium agency storefront',
          'Advanced document management',
          'Priority scout networking',
          'Priority support'
        ],
        is_active: true,
        is_free: false,
        sort_order: 1,
        target_type: 'AGENCY'
      },
      {
        name: 'Elite Agency',
        description: 'World-class agency management suite',
        price: 999.99,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        player_limit: 999999,
        features: [
          'Unlimited player management',
          'Full-scale agency platform',
          'Custom domain for agency profile',
          'Global scout direct access',
          '24/7 dedicated account manager',
          'Full FIFA compliance suite'
        ],
        is_active: true,
        is_free: false,
        sort_order: 2,
        target_type: 'AGENCY'
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
          is_active = EXCLUDED.is_active,
          target_type = EXCLUDED.target_type;
      `, [
        plan.name, plan.description, plan.price, plan.currency, plan.billing_cycle,
        plan.player_limit, JSON.stringify(plan.features), plan.is_active, plan.is_free,
        plan.sort_order, plan.target_type
      ]);
      console.log(`✅ Seeded plan: ${plan.name}`);
    }

    console.log('✨ Agency seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding agency plans:', error);
  }
}

seedAgencyPlans();
