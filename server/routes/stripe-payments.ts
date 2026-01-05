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

// Create Stripe customer for academy
router.post('/create-customer', authenticateToken, (async (req, res) => {
  // Create subscription with Stripe (Legacy - keep for backward compatibility or direct calls)
router.post('/create-subscription', authenticateToken, (async (req, res) => {
  try {
    const academyId = (req as any).user?.id;

    if (!academyId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get academy details
    const academyResult = await query(
      'SELECT name, email, stripe_customer_id FROM academies WHERE id = $1',
      [academyId]
    );

    if (academyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const academy = academyResult.rows[0];

    // Check if customer already exists
    if (academy.stripe_customer_id) {
      return res.json({
        success: true,
        message: 'Customer already exists',
        data: {
          customerId: academy.stripe_customer_id
        }
      });
    }

    // Create Stripe customer
    const customer = await createStripeCustomer(
      academy.email,
      academy.name,
      { academyId }
    );

    // Update academy with customer ID
    await query(
      'UPDATE academies SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
      [customer.id, academyId]
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
    const academyId = (req as any).user?.id;
    const { planId, billingCycle, successUrl, cancelUrl, promoCodeId } = req.body;

    if (!academyId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID and plan ID are required'
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
      // Logic for yearly pricing (e.g., 20% off)
      // This should ideally match the frontend calculation or be stored in DB
      if (plan.name === 'Basic') price = 299; // Example fixed yearly price
      else if (plan.name === 'Pro') price = 599;
      else if (plan.name === 'Elite') price = 999;
      else price = Math.round(price * 12 * 0.8);
    }

    // Apply Promo Code
    let discountAmount = 0;
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
        discountAmount = (price * percent) / 100;
        price = Math.max(0, price - discountAmount);
        
        // Increment usage count
        await query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [promoCodeId]);
      }
    }

    // Get academy details for customer creation
    const academyResult = await query(
      'SELECT name, email, stripe_customer_id FROM academies WHERE id = $1',
      [academyId]
    );
    const academy = academyResult.rows[0];

    // Ensure Stripe customer exists
    let customerId = academy.stripe_customer_id;
    if (!customerId) {
      const customer = await createStripeCustomer(academy.email, academy.name, { academyId });
      customerId = customer.id;
      await query('UPDATE academies SET stripe_customer_id = $1 WHERE id = $2', [customerId, academyId]);
    }

    // Create Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan (${billingCycle})`,
              description: promoCodeId ? `Includes discount` : undefined,
            },
            unit_amount: Math.round(price * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Using payment mode for simplicity, or 'subscription' if using Stripe Products
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        academyId,
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
  try {
    const academyId = (req as any).user?.id;
    const { planId } = req.body;

    if (!academyId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID and plan ID are required'
      });
    }

    const result = await transaction(async (client) => {
      // Get academy details
      const academyResult = await client.query(
        'SELECT name, email, stripe_customer_id FROM academies WHERE id = $1',
        [academyId]
      );

      if (academyResult.rows.length === 0) {
        throw new Error('Academy not found');
      }

      const academy = academyResult.rows[0];

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
      let customerId = academy.stripe_customer_id;
      if (!customerId) {
        const customer = await createStripeCustomer(
          academy.email,
          academy.name,
          { academyId }
        );
        customerId = customer.id;

        await client.query(
          'UPDATE academies SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
          [customerId, academyId]
        );
      }

      // Handle free plans
      if (plan.price === 0 || plan.is_free) {
        // Create local subscription for free plan
        const subscriptionId = uuidv4();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 10); // 10 years for free plan

        await client.query(`
          INSERT INTO academy_subscriptions (
            id, academy_id, plan_id, status, start_date, end_date, 
            auto_renew, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          subscriptionId,
          academyId,
          planId,
          'ACTIVE',
          startDate,
          endDate,
          false
        ]);

        // Create payment record
        const paymentId = uuidv4();
        await client.query(`
          INSERT INTO subscription_payments (
            id, subscription_id, amount, currency, payment_method, 
            payment_reference, status, notes, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          paymentId,
          subscriptionId,
          0,
          'USD',
          'CARD',
          'FREE_PLAN',
          'COMPLETED',
          'Free plan activation'
        ]);

        return {
          type: 'free',
          subscriptionId,
          clientSecret: null
        };
      }

      // For paid plans, create Stripe subscription
      if (!plan.stripe_price_id) {
        throw new Error('Plan does not have a Stripe price ID configured');
      }

      const stripeSubscription = await createStripeSubscription(
        customerId,
        plan.stripe_price_id,
        { academyId, planId }
      );
      const subData: any = (stripeSubscription as any)?.data ?? stripeSubscription;

      // Create local subscription record
      const subscriptionId = uuidv4();
      await client.query(`
        INSERT INTO academy_subscriptions (
          id, academy_id, plan_id, stripe_subscription_id, status, 
          start_date, end_date, auto_renew, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        subscriptionId,
        academyId,
        planId,
        stripeSubscription.id,
        'PENDING',
        new Date((subData.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        new Date((subData.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        true
      ]);

      let clientSecret: string | null = null;
      const latestInvoice: any = (subData.latest_invoice ?? stripeSubscription.latest_invoice);
      if (typeof latestInvoice !== 'string') {
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
    const academyId = (req as any).user?.id;
    const { newPlanId } = req.body;

    if (!academyId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID and new plan ID are required'
      });
    }

    const result = await transaction(async (client) => {
      // Get current subscription
      const currentSubResult = await client.query(`
        SELECT s.*, p.stripe_price_id as current_stripe_price_id
        FROM academy_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.academy_id = $1 AND s.status = 'ACTIVE'
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [academyId]);

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
          UPDATE academy_subscriptions 
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
        // Handle local subscription upgrade (e.g., from free to paid)
        // Cancel current subscription
        await client.query(
          'UPDATE academy_subscriptions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['CANCELLED', currentSubscription.id]
        );

        // Create new subscription (this will trigger the create-subscription logic)
        // For now, return instructions to create new subscription
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
    const academyId = (req as any).user?.id;
    const { immediately = false } = req.body;

    if (!academyId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const result = await transaction(async (client) => {
      // Get current subscription
      const subscriptionResult = await client.query(`
        SELECT * FROM academy_subscriptions 
        WHERE academy_id = $1 AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `, [academyId]);

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
        UPDATE academy_subscriptions 
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
    const academyId = (req as any).user?.id;
    const { amount, currency = 'usd', description } = req.body;

    if (!academyId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID and amount are required'
      });
    }

    // Get academy details
    const academyResult = await query(
      'SELECT stripe_customer_id FROM academies WHERE id = $1',
      [academyId]
    );

    if (academyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const customerId = academyResult.rows[0].stripe_customer_id;

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amount,
      currency,
      customerId,
      { academyId, description }
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
    const academyId = (req as any).user?.id;

    if (!academyId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get current subscription
    const subscriptionResult = await query(`
      SELECT s.*, p.name as plan_name, p.price, p.stripe_price_id
      FROM academy_subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.academy_id = $1 AND s.status IN ('ACTIVE', 'PENDING')
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [academyId]);

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