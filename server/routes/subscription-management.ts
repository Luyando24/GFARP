import { Request, Response, Router, type RequestHandler } from 'express';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

// Get Academy Subscription Details
export const handleGetSubscription: RequestHandler = async (req, res) => {
  try {
    const academyId = (req as any).user?.id;

    if (!academyId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const subscriptionQuery = `
      SELECT 
        s.id, s.status, s.start_date, s.end_date, s.auto_renew,
        p.name as plan_name, p.price, p.player_limit, p.storage_limit,
        a.name as academy_name
      FROM academy_subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      JOIN academies a ON s.academy_id = a.id
      WHERE s.academy_id = $1 AND s.status = 'ACTIVE'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const result = await query(subscriptionQuery, [academyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const subscription = result.rows[0];

    // Calculate usage statistics
    const playerCountQuery = `SELECT COUNT(*) as player_count FROM players WHERE academy_id = $1 AND is_active = true`;
    const playerResult = await query(playerCountQuery, [academyId]);
    const playerCount = parseInt(playerResult.rows[0].player_count);

    const daysRemaining = Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const playerUsagePercentage = (playerCount / subscription.player_limit) * 100;

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.plan_name,
          price: subscription.price,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          autoRenew: subscription.auto_renew,
          daysRemaining: Math.max(0, daysRemaining)
        },
        limits: {
          playerLimit: subscription.player_limit
        },
        usage: {
          playerCount,
          playerUsagePercentage: Math.round(playerUsagePercentage)
        }
      }
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription details',
      error: error.message
    });
  }
};

// Get Available Subscription Plans
// OPTIMIZED FOR VERCEL: Returns fallback plans immediately if DB is slow
export const handleGetPlans: RequestHandler = async (req, res) => {
  console.log('[SUBSCRIPTION] GET /plans request received');

  // CRITICAL: Set very aggressive timeout (2s) for Vercel serverless
  // If database doesn't respond in 2s, return fallback immediately
  const timeoutMs = 2000; // 2 seconds max
  console.log('[SUBSCRIPTION] ✅ New version loaded – timeout set to', timeoutMs, 'ms');
  let responded = false;

  // Start timeout timer that will send fallback plans
  const timeoutId = setTimeout(() => {
    if (!responded) {
      responded = true;
      console.warn('[SUBSCRIPTION] Database timeout after 2s, returning fallback plans');
      res.json({ success: true, data: getFallbackPlans() });
    }
  }, timeoutMs);

  try {
    const plansQuery = `
      SELECT 
        id, name, description, price, currency, billing_cycle,
        player_limit, storage_limit, features, is_active, is_free, sort_order
      FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `;

    console.log('[SUBSCRIPTION] Querying database for plans...');
    const result = await query(plansQuery);

    // Clear timeout if query succeeded
    clearTimeout(timeoutId);

    if (responded) {
      // Already sent fallback response due to timeout
      console.log('[SUBSCRIPTION] Query completed but already sent fallback');
      return;
    }

    responded = true;
    console.log(`[SUBSCRIPTION] Query returned ${result.rows.length} plans`);

    let plans = result.rows.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: parseFloat(plan.price),
      currency: plan.currency,
      billingCycle: plan.billing_cycle,
      playerLimit: plan.player_limit,
      storageLimit: plan.storage_limit,
      features: plan.features,
      isActive: plan.is_active,
      isFree: plan.is_free,
      sortOrder: plan.sort_order
    }));

    // Use fallback if no plans found
    if (!plans || plans.length === 0) {
      console.warn('No active subscription plans found in DB. Returning fallback plans.');
      plans = getFallbackPlans();
    }

    console.log(`[SUBSCRIPTION] Returning ${plans.length} plans to client`);
    return res.json({ success: true, data: plans });

  } catch (dbError: any) {
    clearTimeout(timeoutId);

    if (responded) {
      // Already sent fallback response
      console.log('[SUBSCRIPTION] DB error but already sent fallback');
      return;
    }

    responded = true;
    console.error('[SUBSCRIPTION] DB error, returning fallback:', dbError.message);
    return res.json({ success: true, data: getFallbackPlans() });
  }
}

// Helper function to get fallback plans (extracted to avoid duplication)
function getFallbackPlans() {
  return [
    {
      id: 'free',
      name: 'Free Plan',
      description: 'Get started with core features for small academies.',
      price: 0,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      playerLimit: 25,
      storageLimit: 1024,
      features: [
        'Basic player management',
        'Limited storage',
        'Community support'
      ],
      isActive: true,
      isFree: true,
      sortOrder: 1
    },
    {
      id: 'basic',
      name: 'Basic Plan',
      description: 'Essential tools for growing academies.',
      price: 19.99,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      playerLimit: 100,
      storageLimit: 5120,
      features: [
        'Advanced player tracking',
        'Priority support',
        'Expanded storage'
      ],
      isActive: true,
      isFree: false,
      sortOrder: 2
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      description: 'Professional features for established academies.',
      price: 49.99,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      playerLimit: 500,
      storageLimit: 20480,
      features: [
        'Advanced analytics',
        'Priority support',
        'High storage limits'
      ],
      isActive: true,
      isFree: false,
      sortOrder: 3
    },
    {
      id: 'elite',
      name: 'Elite Plan',
      description: 'All features unlocked for large academies.',
      price: 99.99,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      playerLimit: 2000,
      storageLimit: 51200,
      features: [
        'Full analytics suite',
        'Dedicated support',
        'Maximum storage limits'
      ],
      isActive: true,
      isFree: false,
      sortOrder: 4
    }
  ];
}


// Upgrade Subscription Plan
export const handleUpgradePlan: RequestHandler = async (req, res) => {
  try {
    const { academyId, newPlanId, paymentMethod, paymentReference, notes } = req.body;

    if (!academyId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID and new plan ID are required'
      });
    }

    const result = await transaction(async (client) => {
      // Get current subscription
      const currentSubQuery = `
        SELECT s.*, p.name as current_plan_name
        FROM academy_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.academy_id = $1 AND s.status = 'ACTIVE'
      `;
      const currentSubResult = await client.query(currentSubQuery, [academyId]);

      const currentSubscription = currentSubResult.rows.length > 0 ? currentSubResult.rows[0] : null;

      // Get new plan details
      const newPlanQuery = `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`;
      const newPlanResult = await client.query(newPlanQuery, [newPlanId]);

      if (newPlanResult.rows.length === 0) {
        throw new Error('Invalid or inactive subscription plan');
      }

      const newPlan = newPlanResult.rows[0];

      // If there's an existing subscription, deactivate it
      if (currentSubscription) {
        await client.query(
          `UPDATE academy_subscriptions SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
          [currentSubscription.id]
        );
      }

      // Create new subscription
      const newSubscriptionId = uuidv4();
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const newSubQuery = `
        INSERT INTO academy_subscriptions (
          id, academy_id, plan_id, status, start_date, end_date, 
          auto_renew, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const newSubResult = await client.query(newSubQuery, [
        newSubscriptionId,
        academyId,
        newPlanId,
        'ACTIVE',
        startDate,
        endDate,
        true
      ]);

      const newSubscription = newSubResult.rows[0];

      // Log subscription history
      const historyId = uuidv4();
      const action = currentSubscription ? 'UPGRADED' : 'CREATED';
      const notes = currentSubscription
        ? `Plan upgraded from ${currentSubscription.current_plan_name} to ${newPlan.name}`
        : `Initial subscription created with ${newPlan.name} plan`;

      await client.query(`
        INSERT INTO subscription_history (
          id, subscription_id, action, old_plan_id, new_plan_id, 
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        historyId,
        newSubscriptionId,
        action,
        currentSubscription?.plan_id || null,
        newPlanId,
        notes
      ]);

      // Create payment record for all plans (including free plans)
      let paymentId = null;
      paymentId = uuidv4();

      if (newPlan.price > 0) {
        // For paid plans, use the provided payment method
        await client.query(`
          INSERT INTO subscription_payments (
            id, subscription_id, amount, currency, payment_method, 
            payment_reference, status, notes, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          paymentId,
          newSubscriptionId,
          newPlan.price,
          'USD',
          paymentMethod,
          paymentReference || null,
          paymentMethod === 'CASH' ? 'PENDING' : 'COMPLETED',
          notes || null
        ]);
      } else {
        // For free plans, use a valid payment method from the constraint (CARD)
        await client.query(`
          INSERT INTO subscription_payments (
            id, subscription_id, amount, currency, payment_method, 
            payment_reference, status, notes, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          paymentId,
          newSubscriptionId,
          0,
          'USD',
          'CARD', // Using CARD as a valid payment method instead of 'FREE'
          'FREE_PLAN',
          'COMPLETED',
          'Free plan activation' + (notes ? ': ' + notes : '')
        ]);
      }

      return { newSubscription, newPlan, paymentId };
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: {
        subscription: {
          id: result.newSubscription.id,
          planName: result.newPlan.name,
          status: result.newSubscription.status,
          startDate: result.newSubscription.start_date,
          endDate: result.newSubscription.end_date
        },
        paymentId: result.paymentId,
        paymentStatus: result.newPlan.price > 0
          ? (paymentMethod === 'CASH' ? 'PENDING' : 'COMPLETED')
          : 'NOT_REQUIRED'
      }
    });
  } catch (error: any) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
      error: error.message
    });
  }
}

// Process Cash Payment (Admin only)
export const handleProcessCashPayment: RequestHandler = async (req, res) => {
  try {
    const { paymentId, status, processedBy, notes } = req.body;

    if (!paymentId || !status || !processedBy) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID, status, and processed by are required'
      });
    }

    if (!['COMPLETED', 'FAILED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either COMPLETED or FAILED'
      });
    }

    const result = await transaction(async (client) => {
      // Update payment status
      const updatePaymentQuery = `
        UPDATE subscription_payments 
        SET status = $1, processed_by = $2, notes = $3, payment_date = NOW(), updated_at = NOW()
        WHERE id = $4 AND status = 'PENDING'
        RETURNING *
      `;

      const paymentResult = await client.query(updatePaymentQuery, [
        status,
        processedBy,
        notes || null,
        paymentId
      ]);

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found or already processed');
      }

      const payment = paymentResult.rows[0];

      // If payment failed, deactivate the subscription
      if (status === 'FAILED') {
        await client.query(
          `UPDATE academy_subscriptions SET status = 'CANCELLED' WHERE id = $1`,
          [payment.subscription_id]
        );
      }

      return payment;
    });

    res.json({
      success: true,
      message: `Payment ${status.toLowerCase()} successfully`,
      data: {
        payment: {
          id: result.id,
          status: result.status,
          amount: result.amount,
          paymentDate: result.payment_date
        }
      }
    });
  } catch (error: any) {
    console.error('Process cash payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process cash payment',
      error: error.message
    });
  }
}

// Get Subscription History
export const handleGetSubscriptionHistory: RequestHandler = async (req, res) => {
  try {
    const academyId = req.query.academyId as string;

    if (!academyId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID is required'
      });
    }

    const historyQuery = `
      SELECT 
        h.id, h.action, h.notes, h.created_at,
        p1.name as previous_plan_name,
        p2.name as new_plan_name
      FROM subscription_history h
      JOIN academy_subscriptions s ON h.subscription_id = s.id
      LEFT JOIN subscription_plans p1 ON h.old_plan_id = p1.id
      LEFT JOIN subscription_plans p2 ON h.new_plan_id = p2.id
      WHERE s.academy_id = $1
      ORDER BY h.created_at DESC
      LIMIT 20
    `;

    const result = await query(historyQuery, [academyId]);

    res.json({
      success: true,
      data: {
        history: result.rows.map(record => ({
          id: record.id,
          action: record.action,
          reason: record.notes,
          previousPlan: record.previous_plan_name,
          newPlan: record.new_plan_name,
          createdAt: record.created_at
        }))
      }
    });
  } catch (error: any) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription history',
      error: error.message
    });
  }
}

// Cancel Subscription
export const handleCancelSubscription: RequestHandler = async (req, res) => {
  try {
    const { academyId, reason } = req.body;

    if (!academyId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID is required'
      });
    }

    // Get current active subscription
    const currentSubscriptionQuery = `
      SELECT s.*, sp.name as plan_name, sp.price
      FROM academy_subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.academy_id = $1 AND s.status = 'ACTIVE'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const currentSubscriptionResult = await query(currentSubscriptionQuery, [academyId]);

    if (currentSubscriptionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const currentSubscription = currentSubscriptionResult.rows[0];

    // Update subscription to cancelled (but keep active until end date)
    const cancelSubscriptionQuery = `
      UPDATE academy_subscriptions 
      SET auto_renew = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const cancelResult = await query(cancelSubscriptionQuery, [currentSubscription.id]);
    const cancelledSubscription = cancelResult.rows[0];

    // Log the cancellation in subscription history
    const historyId = uuidv4();
    const historyQuery = `
      INSERT INTO subscription_history (
        id, subscription_id, action, notes, old_plan_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await query(historyQuery, [
      historyId,
      currentSubscription.id,
      'CANCELLED',
      reason || 'User requested cancellation',
      currentSubscription.plan_id
    ]);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. Access will continue until the end of the current billing period.',
      data: {
        subscription: {
          id: cancelledSubscription.id,
          status: cancelledSubscription.status,
          autoRenew: cancelledSubscription.auto_renew,
          endDate: cancelledSubscription.end_date
        }
      }
    });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
}

// Define the router and routes
const subscriptionRouter = Router();
subscriptionRouter.get('/current', authenticateToken, handleGetSubscription);
subscriptionRouter.get('/plans', handleGetPlans);
subscriptionRouter.post('/upgrade', authenticateToken, handleUpgradePlan);
subscriptionRouter.post('/process-payment', authenticateToken, handleProcessCashPayment);
subscriptionRouter.get('/history', authenticateToken, handleGetSubscriptionHistory);
subscriptionRouter.post('/cancel', authenticateToken, handleCancelSubscription);

export default subscriptionRouter;