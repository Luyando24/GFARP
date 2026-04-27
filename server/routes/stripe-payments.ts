import { Router, type RequestHandler } from 'express';
import {
  getStripe,
  createStripeCustomer,
  createStripeSubscription,
  createPaymentIntent,
  getStripeSubscription,
  cancelStripeSubscription,
  updateStripeSubscription
} from '../lib/stripe.js';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Helper to get entity info
const getEntityInfo = (user: any) => {
  const isAgency = user?.role === 'agency';
  return {
    isAgency,
    table: isAgency ? 'agencies' : 'academies',
    subTable: isAgency ? 'agency_subscriptions' : 'academy_subscriptions',
    idColumn: isAgency ? 'agency_id' : 'academy_id',
    entityLabel: isAgency ? 'Agency' : 'Academy'
  };
};

// Create Stripe customer
router.post('/create-customer', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { table, entityLabel } = getEntityInfo((req as any).user);

    if (!entityId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get entity details
    const entityResult = await query(
      `SELECT name, email, stripe_customer_id FROM ${table} WHERE id = $1`,
      [entityId]
    );

    if (entityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `${entityLabel} not found`
      });
    }

    const entity = entityResult.rows[0];

    // Check if customer already exists
    if (entity.stripe_customer_id) {
      return res.json({
        success: true,
        message: 'Customer already exists',
        data: {
          customerId: entity.stripe_customer_id
        }
      });
    }

    // Create Stripe customer
    const customer = await createStripeCustomer(
      entity.email,
      entity.name,
      { entityId, type: entityLabel.toLowerCase() }
    );

    // Update entity with customer ID
    await query(
      `UPDATE ${table} SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
      [customer.id, entityId]
    );

    res.json({
      success: true,
      message: 'Stripe customer created successfully',
      data: {
        customerId: customer.id
      }
    });
  } catch (error: any) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Stripe customer',
      error: error.message
    });
  }
}) as RequestHandler);

// Create checkout session for subscription upgrade
router.post('/create-checkout-session', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { table } = getEntityInfo((req as any).user);
    const { planId, billingCycle, successUrl, cancelUrl, promoCodeId } = req.body;

    if (!entityId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Entity ID and plan ID are required'
      });
    }

    // Get plan details
    const planResult = await query(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const plan = planResult.rows[0];
    let price = Number(plan.price);
    
    // Apply billing cycle adjustment
    if (billingCycle === 'yearly') {
      price = price * 10; // Simple 2 months free logic or use plan.price_yearly if exists
    }

    // Apply Promo Code
    if (promoCodeId) {
      const promoRes = await query(
        `SELECT * FROM promo_codes 
         WHERE id = $1 AND status = 'active' 
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
        [promoCodeId]
      );

      if (promoRes.rows.length > 0) {
        const promo = promoRes.rows[0];
        const percent = parseFloat(promo.discount_percent);
        price = Math.max(0, price - (price * percent / 100));
        
        await query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [promoCodeId]);
      }
    }

    // Get entity details for customer creation
    const entityResult = await query(
      `SELECT name, email, stripe_customer_id FROM ${table} WHERE id = $1`,
      [entityId]
    );
    const entity = entityResult.rows[0];

    // Ensure Stripe customer exists
    let customerId = entity.stripe_customer_id;
    if (!customerId) {
      const customer = await createStripeCustomer(entity.email, entity.name, { entityId });
      customerId = customer.id;
      await query(`UPDATE ${table} SET stripe_customer_id = $1 WHERE id = $2`, [customerId, entityId]);
    }

    // Create Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        plan.stripe_price_id ? {
          price: plan.stripe_price_id,
          quantity: 1,
        } : {
          price_data: {
            currency: plan.currency?.toLowerCase() || 'usd',
            product_data: {
              name: `${plan.name} Plan (${billingCycle})`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: plan.stripe_price_id ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        entityId,
        planId,
        billingCycle,
        promoCodeId: promoCodeId || null
      }
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
}) as RequestHandler);

// Create subscription directly (via card payment element)
router.post('/create-subscription', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { table, subTable, idColumn, entityLabel } = getEntityInfo((req as any).user);
    const { planId } = req.body;

    if (!entityId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Entity ID and plan ID are required'
      });
    }

    const result = await transaction(async (client) => {
      // Get entity details
      const entityResult = await client.query(
        `SELECT name, email, stripe_customer_id FROM ${table} WHERE id = $1`,
        [entityId]
      );

      if (entityResult.rows.length === 0) {
        throw new Error(`${entityLabel} not found`);
      }

      const entity = entityResult.rows[0];

      // Get plan details
      const planResult = await client.query(
        'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
        [planId]
      );

      if (planResult.rows.length === 0) {
        throw new Error('Plan not found or inactive');
      }

      const plan = planResult.rows[0];

      // Create Stripe customer if doesn't exist
      let customerId = entity.stripe_customer_id;
      if (!customerId) {
        const customer = await createStripeCustomer(
          entity.email,
          entity.name,
          { entityId }
        );
        customerId = customer.id;

        await client.query(
          `UPDATE ${table} SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
          [customerId, entityId]
        );
      }

      // For paid plans, create Stripe subscription
      if (!plan.stripe_price_id) {
        throw new Error('Plan does not have a Stripe price ID configured');
      }

      const stripeSubscription = await createStripeSubscription(
        customerId,
        plan.stripe_price_id,
        { entityId, planId }
      );
      const subData: any = (stripeSubscription as any)?.data ?? stripeSubscription;

      // Create local subscription record
      const subscriptionId = uuidv4();
      await client.query(`
        INSERT INTO ${subTable} (
          id, ${idColumn}, plan_id, stripe_subscription_id, status, 
          start_date, end_date, auto_renew, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        subscriptionId,
        entityId,
        planId,
        stripeSubscription.id,
        'PENDING',
        new Date((subData.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        new Date((subData.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        true
      ]);

      let clientSecret: string | null = null;
      const latestInvoice: any = (subData.latest_invoice ?? stripeSubscription.latest_invoice);
      if (typeof latestInvoice !== 'string' && latestInvoice) {
        const paymentIntent: any = latestInvoice.payment_intent;
        if (typeof paymentIntent !== 'string') {
          clientSecret = paymentIntent?.client_secret ?? null;
        }
      }

      return {
        type: 'paid',
        subscriptionId,
        stripeSubscriptionId: stripeSubscription.id,
        clientSecret
      };
    });

    res.json({
      success: true,
      message: 'Subscription created successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
}) as RequestHandler);

// Upgrade subscription
router.post('/upgrade-subscription', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { subTable, idColumn } = getEntityInfo((req as any).user);
    const { newPlanId } = req.body;

    if (!entityId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: 'Entity ID and new plan ID are required'
      });
    }

    const result = await transaction(async (client) => {
      // Get current subscription
      const currentSubResult = await client.query(`
        SELECT s.*, p.stripe_price_id as current_stripe_price_id
        FROM ${subTable} s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.${idColumn} = $1 AND s.status = 'ACTIVE'
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [entityId]);

      if (currentSubResult.rows.length === 0) {
        throw new Error('No active subscription found');
      }

      const currentSubscription = currentSubResult.rows[0];

      // Get new plan details
      const newPlanResult = await client.query(
        'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
        [newPlanId]
      );

      if (newPlanResult.rows.length === 0) {
        throw new Error('New plan not found or inactive');
      }

      const newPlan = newPlanResult.rows[0];

      // If current subscription is Stripe-managed
      if (currentSubscription.stripe_subscription_id && newPlan.stripe_price_id) {
        // Update Stripe subscription
        const updatedStripeSubscription = await updateStripeSubscription(
          currentSubscription.stripe_subscription_id,
          newPlan.stripe_price_id
        );
        const updatedData: any = (updatedStripeSubscription as any)?.data ?? updatedStripeSubscription;

        // Update local subscription
        await client.query(`
          UPDATE ${subTable} 
          SET 
            plan_id = $1,
            end_date = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [
          newPlanId,
          new Date((updatedData.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          currentSubscription.id
        ]);

        return {
          type: 'stripe_upgrade',
          subscriptionId: currentSubscription.id,
          stripeSubscriptionId: updatedData.id
        };
      } else {
        // Cancel current subscription
        await client.query(
          `UPDATE ${subTable} SET status = $1, updated_at = NOW() WHERE id = $2`,
          ['CANCELLED', currentSubscription.id]
        );

        return {
          type: 'new_subscription_required',
          message: 'Please create a new subscription for the upgraded plan'
        };
      }
    });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription',
      error: error.message
    });
  }
}) as RequestHandler);

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { subTable, idColumn } = getEntityInfo((req as any).user);
    const { immediately = false } = req.body;

    if (!entityId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const result = await transaction(async (client) => {
      // Get current subscription
      const subscriptionResult = await client.query(`
        SELECT * FROM ${subTable} 
        WHERE ${idColumn} = $1 AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `, [entityId]);

      if (subscriptionResult.rows.length === 0) {
        throw new Error('No active subscription found');
      }

      const subscription = subscriptionResult.rows[0];

      // If it's a Stripe subscription, cancel it
      if (subscription.stripe_subscription_id) {
        await cancelStripeSubscription(subscription.stripe_subscription_id, immediately);
      }

      // Update local subscription
      const newStatus = immediately ? 'CANCELLED' : 'ACTIVE';
      await client.query(`
        UPDATE ${subTable} 
        SET 
          status = $1,
          auto_renew = false,
          updated_at = NOW()
        WHERE id = $2
      `, [newStatus, subscription.id]);

      return {
        subscriptionId: subscription.id,
        cancelled: immediately,
        willCancelAtPeriodEnd: !immediately
      };
    });

    res.json({
      success: true,
      message: immediately ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end',
      data: result
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
}) as RequestHandler);

// Create payment intent for one-time payments
router.post('/create-payment-intent', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { table, entityLabel } = getEntityInfo((req as any).user);
    const { amount, currency = 'usd', description } = req.body;

    if (!entityId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Entity ID and amount are required'
      });
    }

    // Get entity details
    const entityResult = await query(
      `SELECT stripe_customer_id FROM ${table} WHERE id = $1`,
      [entityId]
    );

    if (entityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `${entityLabel} not found`
      });
    }

    const customerId = entityResult.rows[0].stripe_customer_id;

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amount,
      currency,
      customerId,
      { entityId, description }
    );

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
}) as RequestHandler);

// Get subscription status
router.get('/subscription-status', authenticateToken, (async (req, res) => {
  try {
    const entityId = (req as any).user?.id;
    const { subTable, idColumn } = getEntityInfo((req as any).user);

    if (!entityId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get current subscription
    const subscriptionResult = await query(`
      SELECT s.*, p.name as plan_name, p.price, p.stripe_price_id
      FROM ${subTable} s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.${idColumn} = $1 AND s.status IN ('ACTIVE', 'PENDING')
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [entityId]);

    if (subscriptionResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false
        }
      });
    }

    const subscription = subscriptionResult.rows[0];

    // If it's a Stripe subscription, get latest status
    let stripeStatus = null;
    if (subscription.stripe_subscription_id) {
      try {
        const stripeSubscription = await getStripeSubscription(subscription.stripe_subscription_id);
        const subData: any = (stripeSubscription as any)?.data ?? stripeSubscription;
        stripeStatus = {
          status: subData.status,
          currentPeriodEnd: new Date((subData.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          cancelAtPeriodEnd: subData.cancel_at_period_end
        };
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.plan_name,
          price: subscription.price,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          autoRenew: subscription.auto_renew,
          stripeSubscriptionId: subscription.stripe_subscription_id
        },
        stripeStatus
      }
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status',
      error: error.message
    });
  }
}) as RequestHandler);

export default router;
