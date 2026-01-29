import 'dotenv/config';
import Stripe from 'stripe';
import { query, transaction } from '../server/lib/db';

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: string; // DECIMAL returned as string
  currency: string; // e.g. 'USD'
  billing_cycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  is_free: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function toCents(decimal: string): number {
  const num = Number(decimal);
  if (Number.isNaN(num)) throw new Error(`Invalid price: ${decimal}`);
  return Math.round(num * 100);
}

function mapInterval(cycle: PlanRow['billing_cycle']): 'month' | 'year' | null {
  if (cycle === 'MONTHLY') return 'month';
  if (cycle === 'YEARLY') return 'year';
  return null; // LIFETIME or one-time
}

async function main() {
  const stripeSecret = assertEnv('STRIPE_SECRET_KEY');
  assertEnv('DATABASE_URL');

  const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });

  console.log('Fetching active subscription plans...');
  const { rows } = await query<PlanRow>(
    `SELECT 
      id, name, description, price, currency, billing_cycle, is_free,
      stripe_product_id, stripe_price_id
     FROM subscription_plans
     WHERE is_active = TRUE AND (name = 'Pro' OR name = 'Pro Plan')
     ORDER BY sort_order, created_at`
  );

  const plans = rows as unknown as PlanRow[];
  if (!plans.length) {
    console.log('No active plans found. Nothing to provision.');
    return;
  }

  console.log(`Found ${plans.length} plans. Starting provisioning...`);

  for (const plan of plans) {
    // Skip plans with 0 price (Stripe cannot create $0 recurring prices)
    if (plan.is_free || Number(plan.price) === 0) {
      console.log(`[${plan.name}] Skipping plan with 0 price.`);
      continue;
    }

    if (plan.stripe_price_id) {
      console.log(`[${plan.name}] Already has Stripe price: ${plan.stripe_price_id}. Skipping.`);
      continue;
    }

    const currency = plan.currency.toLowerCase();
    const unitAmount = toCents(plan.price);
    const interval = mapInterval(plan.billing_cycle);

    await transaction(async (client) => {
      // 1) Create or reuse product
      let productId = plan.stripe_product_id;

      if (!productId) {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description ?? `Subscription plan: ${plan.name}`,
          metadata: {
            local_plan_id: plan.id,
            billing_cycle: plan.billing_cycle,
          },
        });
        productId = product.id;
        await client.query(
          'UPDATE subscription_plans SET stripe_product_id = $1, updated_at = NOW() WHERE id = $2',
          [productId, plan.id]
        );
        console.log(`[${plan.name}] Created product ${productId}.`);
      } else {
        console.log(`[${plan.name}] Reusing product ${productId}.`);
      }

      // 2) Create price (recurring for monthly/yearly, one-time for lifetime)
      let priceId: string;
      if (interval) {
        const price = await stripe.prices.create({
          currency,
          unit_amount: unitAmount,
          product: productId,
          recurring: { interval },
          metadata: {
            local_plan_id: plan.id,
          },
        });
        priceId = price.id;
      } else {
        // LIFETIME or non-recurring plan: one-time price
        const price = await stripe.prices.create({
          currency,
          unit_amount: unitAmount,
          product: productId,
          metadata: {
            local_plan_id: plan.id,
            type: 'one_time',
          },
        });
        priceId = price.id;
      }

      await client.query(
        'UPDATE subscription_plans SET stripe_price_id = $1, updated_at = NOW() WHERE id = $2',
        [priceId, plan.id]
      );

      console.log(`[${plan.name}] Created price ${priceId} (${currency} ${unitAmount}/cent${interval ? `, ${interval}` : ''}).`);
    });
  }

  console.log('Provisioning complete.');
}

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});