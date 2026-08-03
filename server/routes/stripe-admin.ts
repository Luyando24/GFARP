import { Router, type RequestHandler } from 'express';
import Stripe from 'stripe';
import { subscriptionSync } from '../lib/subscription-sync.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query } from '../lib/db.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken, requireAdmin);

function requestedAcademyId(req: any): string | null {
  const value = req.body?.academyId || req.query?.academyId;
  return value ? String(value) : null;
}

/**
 * Sync subscriptions for the authenticated academy
 */
router.post('/sync', (async (req, res) => {
  try {
    const academyId = requestedAcademyId(req);
    
    if (!academyId) {
      return res.status(400).json({ error: 'Academy ID not found' });
    }

    console.log(`Starting subscription sync for academy ${academyId}`);
    
    const result = await subscriptionSync.syncAcademySubscriptions(academyId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced ${result.synced} subscriptions`,
        synced: result.synced,
        errors: result.errors
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Sync completed with errors',
        synced: result.synced,
        errors: result.errors
      });
    }
  } catch (error: any) {
    console.error('Sync endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message
    });
  }
}) as RequestHandler);

/**
 * Validate subscription consistency for the authenticated academy
 */
router.get('/validate', (async (req, res) => {
  try {
    const academyId = requestedAcademyId(req);
    
    if (!academyId) {
      return res.status(400).json({ error: 'Academy ID not found' });
    }

    console.log(`Validating subscription consistency for academy ${academyId}`);
    
    const validation = await subscriptionSync.validateSubscriptionConsistency(academyId);
    
    res.json({
      consistent: validation.consistent,
      issues: validation.issues,
      message: validation.consistent 
        ? 'All subscriptions are consistent with Stripe'
        : `Found ${validation.issues.length} consistency issues`
    });
  } catch (error: any) {
    console.error('Validation endpoint error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
}) as RequestHandler);

/**
 * Get subscription status and details
 */
router.get('/status', (async (req, res) => {
  try {
    const academyId = requestedAcademyId(req);
    
    if (!academyId) {
      return res.status(400).json({ error: 'Academy ID not found' });
    }

    // Get current subscription details
    const subscriptionResult = await query(`
      SELECT 
        s.id,
        s.status,
        s.start_date,
        s.end_date,
        s.auto_renew,
        s.stripe_subscription_id,
        p.name as plan_name,
        p.price,
        p.currency,
        p.stripe_price_id,
        a.stripe_customer_id
      FROM academy_subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      JOIN academies a ON s.academy_id = a.id
      WHERE s.academy_id = $1 AND s.status IN ('ACTIVE', 'SUSPENDED', 'PENDING')
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [academyId]);

    // Get recent payments
    const paymentsResult = await query(`
      SELECT 
        sp.amount,
        sp.currency,
        sp.status,
        sp.payment_method,
        sp.stripe_invoice_id,
        sp.created_at
      FROM subscription_payments sp
      JOIN academy_subscriptions s ON sp.subscription_id = s.id
      WHERE s.academy_id = $1
      ORDER BY sp.created_at DESC
      LIMIT 5
    `, [academyId]);

    const subscription = subscriptionResult.rows[0] || null;
    const payments = paymentsResult.rows;

    res.json({
      subscription,
      payments,
      hasStripeIntegration: !!subscription?.stripe_subscription_id,
      message: subscription 
        ? `Active subscription: ${subscription.plan_name}`
        : 'No active subscription found'
    });
  } catch (error: any) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
}) as RequestHandler);

/**
 * Get subscription history and events
 */
router.get('/history', (async (req, res) => {
  try {
    const academyId = requestedAcademyId(req);
    
    if (!academyId) {
      return res.status(400).json({ error: 'Academy ID not found' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const historyResult = await query(`
      SELECT 
        sh.action,
        sh.notes,
        sh.old_status,
        sh.new_status,
        sh.created_at,
        COALESCE(new_plan.name, current_plan.name) as plan_name
      FROM subscription_history sh
      JOIN academy_subscriptions s ON sh.subscription_id = s.id
      LEFT JOIN subscription_plans current_plan ON s.plan_id = current_plan.id
      LEFT JOIN subscription_plans new_plan ON sh.new_plan_id = new_plan.id
      WHERE s.academy_id = $1
      ORDER BY sh.created_at DESC
      LIMIT $2 OFFSET $3
    `, [academyId, limit, offset]);

    const totalResult = await query(
      `SELECT COUNT(*) as total
       FROM subscription_history sh
       JOIN academy_subscriptions s ON sh.subscription_id = s.id
       WHERE s.academy_id = $1`,
      [academyId]
    );

    res.json({
      history: historyResult.rows,
      total: parseInt(totalResult.rows[0].total),
      limit,
      offset
    });
  } catch (error: any) {
    console.error('History endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get history',
      message: error.message
    });
  }
}) as RequestHandler);

/**
 * Force refresh subscription data from Stripe
 */
router.post('/refresh', (async (req, res) => {
  try {
    const academyId = requestedAcademyId(req);
    
    if (!academyId) {
      return res.status(400).json({ error: 'Academy ID not found' });
    }

    console.log(`Force refreshing subscription data for academy ${academyId}`);
    
    // First validate current state
    const validation = await subscriptionSync.validateSubscriptionConsistency(academyId);
    
    // Then sync if there are issues or if forced
    const syncResult = await subscriptionSync.syncAcademySubscriptions(academyId);
    
    res.json({
      validation: {
        consistent: validation.consistent,
        issues: validation.issues
      },
      sync: {
        success: syncResult.success,
        synced: syncResult.synced,
        errors: syncResult.errors
      },
      message: syncResult.success 
        ? 'Subscription data refreshed successfully'
        : 'Refresh completed with errors'
    });
  } catch (error: any) {
    console.error('Refresh endpoint error:', error);
    res.status(500).json({
      error: 'Refresh failed',
      message: error.message
    });
  }
}) as RequestHandler);

// --------------------
// Stripe Settings (Postgres)
// --------------------

// Stripe credentials are deployment secrets and are never returned or persisted.
router.get('/settings', (async (_req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  res.json({
    secret_key_set: Boolean(secretKey),
    webhook_secret_set: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    is_env_config: true,
    mode: secretKey.startsWith('sk_live_')
      ? 'live'
      : secretKey.startsWith('sk_test_')
        ? 'test'
        : null,
  });
}) as RequestHandler);

router.put('/settings', ((_req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Stripe credentials must be configured as deployment environment variables',
  });
}) as RequestHandler);


// List subscription plans with Stripe mapping
router.get('/plans', (async (_req, res) => {
  try {
    const plansResult = await query(
      `SELECT id, name, description, price, currency, billing_cycle, is_active, is_free, stripe_product_id, stripe_price_id
       FROM subscription_plans
       ORDER BY sort_order ASC, created_at ASC`
    );
    res.json({ plans: plansResult.rows });
  } catch (error: any) {
    console.error('Error listing plans:', error);
    res.status(500).json({ error: 'Failed to list plans', message: error.message });
  }
}) as RequestHandler);

// Create or update Stripe Product/Price for a plan
router.post('/plans/:planId/price', (async (req, res) => {
  try {
    const { planId } = req.params;
    const { amount, currency, interval } = req.body;

    if (!planId) return res.status(400).json({ error: 'planId is required' });

    // Fetch plan
    const planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planResult.rows[0];

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return res.status(400).json({ error: 'Stripe secret key not configured' });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2025-10-29.clover', typescript: true });

    const resolvedCurrency = currency || plan.currency || 'USD';
    const resolvedAmount = typeof amount === 'number' ? amount : Number(plan.price);
    const planInterval = interval || (plan.billing_cycle === 'YEARLY' ? 'year' : plan.billing_cycle === 'MONTHLY' ? 'month' : null);

    // Ensure product exists
    let productId = plan.stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({ name: plan.name, description: plan.description || undefined });
      productId = product.id;
      await query('UPDATE subscription_plans SET stripe_product_id = $1, updated_at = NOW() WHERE id = $2', [productId, planId]);
    }

    let priceId: string | null = null;
    if (planInterval) {
      const price = await stripe.prices.create({
        unit_amount: Math.round(resolvedAmount * 100),
        currency: resolvedCurrency.toLowerCase(),
        recurring: { interval: planInterval },
        product: productId,
      });
      priceId = price.id;
    } else {
      const price = await stripe.prices.create({
        unit_amount: Math.round(resolvedAmount * 100),
        currency: resolvedCurrency.toLowerCase(),
        product: productId,
      });
      priceId = price.id;
    }

    await query('UPDATE subscription_plans SET stripe_price_id = $1, updated_at = NOW() WHERE id = $2', [priceId, planId]);

    res.json({ success: true, productId, priceId });
  } catch (error: any) {
    console.error('Error creating/updating Stripe price:', error);
    res.status(500).json({ error: 'Failed to create/update Stripe price', message: error.message });
  }
}) as RequestHandler);

export default router;
