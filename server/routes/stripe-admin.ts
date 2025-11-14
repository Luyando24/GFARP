import { Router, type RequestHandler } from 'express';
import Stripe from 'stripe';
import { subscriptionSync } from '../lib/subscription-sync.js';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../lib/db.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Sync subscriptions for the authenticated academy
 */
router.post('/sync', (async (req, res) => {
  try {
    const academyId = (req as any).user?.academyId;
    
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
    const academyId = (req as any).user?.academyId;
    
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
    const academyId = (req as any).user?.academyId;
    
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
      WHERE s.academy_id = $1 AND s.status IN ('ACTIVE', 'PAST_DUE', 'TRIALING')
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
    const academyId = (req as any).user?.academyId;
    
    if (!academyId) {
      return res.status(400).json({ error: 'Academy ID not found' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const historyResult = await query(`
      SELECT 
        sh.action,
        sh.details,
        sh.created_at,
        p.name as plan_name
      FROM subscription_history sh
      LEFT JOIN academy_subscriptions s ON sh.subscription_id = s.id
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE sh.academy_id = $1
      ORDER BY sh.created_at DESC
      LIMIT $2 OFFSET $3
    `, [academyId, limit, offset]);

    const totalResult = await query(
      'SELECT COUNT(*) as total FROM subscription_history WHERE academy_id = $1',
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
    const academyId = (req as any).user?.academyId;
    
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

export default router;

// --------------------
// Stripe Settings (Postgres)
// --------------------

// Get Stripe settings (secret key presence and webhook secret)
router.get('/settings', (async (req, res) => {
  try {
    const result = await query(
      `SELECT key, value, is_secret FROM system_settings WHERE key IN ('stripe.secret_key','stripe.webhook_secret')`
    );

    const map: Record<string, { value: string; is_secret: boolean }> = {};
    for (const row of result.rows) {
      map[row.key] = { value: row.value, is_secret: row.is_secret };
    }

    const secretKey = map['stripe.secret_key']?.value || null;
    const webhookSecret = map['stripe.webhook_secret']?.value || null;
    const mode = secretKey?.startsWith('sk_live_') ? 'live' : (secretKey?.startsWith('sk_test_') ? 'test' : null);

    res.json({
      secret_key_set: !!secretKey,
      webhook_secret_set: !!webhookSecret,
      mode,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe settings:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe settings', message: error.message });
  }
}) as RequestHandler);

// Update Stripe settings
router.put('/settings', (async (req, res) => {
  try {
    const { secretKey, webhookSecret } = req.body || {};

    if (!secretKey && !webhookSecret) {
      return res.status(400).json({ error: 'Provide secretKey or webhookSecret' });
    }

    const updates: Array<{ key: string; value: string; is_secret: boolean }> = [];
    if (secretKey) updates.push({ key: 'stripe.secret_key', value: secretKey, is_secret: true });
    if (webhookSecret) updates.push({ key: 'stripe.webhook_secret', value: webhookSecret, is_secret: true });

    for (const u of updates) {
      await query(
        `INSERT INTO system_settings(key, value, is_secret, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, is_secret = EXCLUDED.is_secret, updated_at = NOW()`,
        [u.key, u.value, u.is_secret]
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Stripe settings:', error);
    res.status(500).json({ error: 'Failed to update Stripe settings', message: error.message });
  }
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

    // Load Stripe key from settings
    const settingsResult = await query(
      `SELECT value FROM system_settings WHERE key = 'stripe.secret_key'`
    );
    const secretKey = settingsResult.rows[0]?.value || process.env.STRIPE_SECRET_KEY;
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