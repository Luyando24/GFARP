import { Request, Response, Router, type RequestHandler } from 'express';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { getStripe, createStripeCustomer, STRIPE_CONFIG } from '../lib/stripe.js';
import { emailService } from '../lib/email-service.js';

// Get Academy Subscription Details
export const handleGetSubscription: RequestHandler = async (req, res) => {
  try {
    const orgId = (req as any).user?.id;
    const role = (req as any).user?.role;

    if (!orgId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const isAgency = role === 'AGENCY_ADMIN';
    const subTable = isAgency ? 'agency_subscriptions' : 'academy_subscriptions';
    const orgTable = isAgency ? 'agencies' : 'academies';
    const orgIdColumn = isAgency ? 'agency_id' : 'academy_id';

    const subscriptionQuery = `
      SELECT 
        s.id, s.status, s.start_date, s.end_date, s.auto_renew,
        p.name as plan_name, p.price, p.player_limit, p.features,
        o.name as organization_name
      FROM ${subTable} s
      JOIN subscription_plans p ON s.plan_id = p.id
      JOIN ${orgTable} o ON s.${orgIdColumn} = o.id
      WHERE s.${orgIdColumn} = $1 AND s.status = 'ACTIVE'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const result = await query(subscriptionQuery, [orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const subscription = result.rows[0];

    // Calculate usage statistics
    const playerCountQuery = `SELECT COUNT(*) as player_count FROM players WHERE ${orgIdColumn} = $1 AND is_active = true`;
    const playerResult = await query(playerCountQuery, [orgId]);
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
          daysRemaining: Math.max(0, daysRemaining),
          features: typeof subscription.features === 'string' ? JSON.parse(subscription.features) : (subscription.features || [])
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
  // Aggressive timeout for serverless, but let's give it more room in dev/slow DBs
  const timeoutMs = 10000; // 10 seconds
  console.log('[SUBSCRIPTION] Fetching plans. req.query:', JSON.stringify(req.query));
  
  let responded = false;
  
  // Extract targetType robustly
  let targetType = 'ACADEMY';
  if (req.query.targetType) {
    targetType = Array.isArray(req.query.targetType) 
      ? String(req.query.targetType[0]) 
      : String(req.query.targetType);
  }
  
  targetType = targetType.toUpperCase();

  // Start timeout timer that will send fallback plans
  const timeoutId = setTimeout(() => {
    if (!responded) {
      responded = true;
      console.warn('[SUBSCRIPTION] Database timeout after 10s, returning fallback plans for:', targetType);
      res.json({ success: true, data: getFallbackPlans(targetType) });
    }
  }, timeoutMs);

  try {
    const includeInactive = req.query.includeInactive === 'true';

    let plansQuery = `
      SELECT 
        id, name, description, price, currency, billing_cycle,
        player_limit, storage_limit, features, is_active, is_free, sort_order, target_type
      FROM subscription_plans 
      WHERE target_type = $1
    `;

    if (!includeInactive) {
      plansQuery += ' AND is_active = true';
    }

    plansQuery += ' ORDER BY sort_order ASC';

    const result = await query(plansQuery, [targetType]);

    // Clear timeout if query succeeded
    clearTimeout(timeoutId);

    if (responded) {
      // Already sent fallback response due to timeout
      console.log('[SUBSCRIPTION] Query completed but already sent fallback');
      return;
    }

    responded = true;
    const dbRowCount = result.rows.length;
    const dbFirstRowTargetType = result.rows.length > 0 ? result.rows[0].target_type : null;

    let plans = result.rows
      .filter(plan => {
        // Double-check: Manual filter in case SQL WHERE failed on live
        return plan.target_type === targetType;
      })
      .map(plan => {
      // Parse features if it's a JSON string
      let features = plan.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch (e) {
          console.error('[SUBSCRIPTION] Failed to parse features for plan:', plan.name, e);
          features = [];
        }
      }

      const mappedPlan = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: parseFloat(plan.price),
        currency: plan.currency,
        billing_cycle: plan.billing_cycle,
        player_limit: plan.player_limit,
        features: features,
        is_active: plan.is_active,
        is_free: plan.is_free,
        sort_order: plan.sort_order,
        target_type: plan.target_type,
        storage_limit: plan.storage_limit || 5368709120 // Default 5GB if missing
      };

      return mappedPlan;
    });

    // DO NOT use fallback just because length is 0. 
    // If the user deactivated all plans, we should honor that and show 0 plans.
    // Fallbacks should ONLY be used for genuine DB errors or timeouts.
    
    console.log(`[SUBSCRIPTION] Query successful, returning ${plans.length} plans to client`);
    return res.json({ 
      success: true, 
      data: plans,
      _debug: {
        requestedTargetType: targetType,
        dbRowsReturned: dbRowCount,
        dbFirstRowTargetType: dbFirstRowTargetType,
        filteredCount: plans.length
      }
    });

  } catch (dbError: any) {
    clearTimeout(timeoutId);

    if (responded) {
      // Already sent fallback response
      console.log('[SUBSCRIPTION] DB error but already sent fallback');
      return;
    }

    responded = true;
    console.error('[SUBSCRIPTION] DB error, returning fallback:', dbError.message);
    return res.json({ success: true, data: getFallbackPlans(targetType) });
  }
}

// Helper function to get fallback plans (extracted to avoid duplication)
function getFallbackPlans(targetType: string = 'ACADEMY') {
  if (targetType === 'INDIVIDUAL') {
    return [
      {
        id: 'ind-pro',
        name: 'Pro Plan',
        description: 'Elite features for rising stars.',
        price: 19.99,
        currency: 'USD',
        billing_cycle: 'LIFETIME',
        player_limit: 1,
        features: [
          'Unlimited profile updates',
          'Video highlights upload',
          'Direct messaging with scouts',
          'Priority support',
          'Verified player badge'
        ],
        is_active: true,
        is_free: false,
        sort_order: 0,
        target_type: 'INDIVIDUAL',
        storage_limit: 5368709120
      }
    ];
  }

  if (targetType === 'AGENCY') {
    return [
      {
        id: 'agency-basic',
        name: 'Basic Agency',
        description: 'For growing talent agencies.',
        price: 99.99,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        player_limit: 100,
        features: ['Up to 100 player profiles', 'Basic agency branding', 'Document management'],
        is_active: true,
        is_free: false,
        sort_order: 0,
        target_type: 'AGENCY',
        storage_limit: 10737418240
      },
      {
        id: 'agency-pro',
        name: 'Professional Agency',
        description: 'Advanced tools for busy agents.',
        price: 299.99,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        player_limit: 500,
        features: ['Up to 500 player profiles', 'Full agency branding', 'Advanced analytics'],
        is_active: true,
        is_free: false,
        sort_order: 1,
        target_type: 'AGENCY',
        storage_limit: 53687091200
      }
    ];
  }

  return [
    {
      id: 'free',
      name: 'Free Plan',
      description: 'Basic features for new academies.',
      price: 0,
      currency: 'USD',
      billing_cycle: 'LIFETIME',
      player_limit: 50,
      features: ['Up to 50 players', 'Basic registration', 'Standard support'],
      is_active: true,
      is_free: true,
      sort_order: 0,
      target_type: 'ACADEMY',
      storage_limit: 5368709120
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      description: 'Professional features for established academies.',
      price: 49.99,
      currency: 'USD',
      billing_cycle: 'MONTHLY',
      player_limit: 500,
      features: ['Up to 500 players', 'Advanced analytics', 'Priority support'],
      is_active: true,
      is_free: false,
      sort_order: 1,
      target_type: 'ACADEMY',
      storage_limit: 5368709120
    },
    {
      id: 'elite',
      name: 'Elite Plan',
      description: 'Comprehensive suite for large organizations.',
      price: 99.99,
      currency: 'USD',
      billing_cycle: 'MONTHLY',
      player_limit: -1,
      features: ['Unlimited players', 'Full FIFA compliance', 'Dedicated manager'],
      is_active: true,
      is_free: false,
      sort_order: 2,
      target_type: 'ACADEMY',
      storage_limit: 53687091200
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

    const user = (req as any).user;
    const isAgency = user?.role === 'AGENCY_ADMIN';
    const subTable = isAgency ? 'agency_subscriptions' : 'academy_subscriptions';
    const orgTable = isAgency ? 'agencies' : 'academies';
    const orgIdColumn = isAgency ? 'agency_id' : 'academy_id';

    // If payment method is CARD, we need to handle Stripe
    if (paymentMethod === 'CARD') {
      try {
        // Get organization details
        const orgResult = await query(
          `SELECT name, email, stripe_customer_id FROM ${orgTable} WHERE id = $1`,
          [academyId]
        );

        if (orgResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Organization not found'
          });
        }

        const organization = orgResult.rows[0];

        // Ensure Stripe customer exists
        let customerId = organization.stripe_customer_id;
        if (!customerId) {
          const customer = await createStripeCustomer(
            organization.email,
            organization.name,
            { orgId: academyId, type: isAgency ? 'AGENCY' : 'ACADEMY' }
          );
          customerId = customer.id;
          await query(`UPDATE ${orgTable} SET stripe_customer_id = $1 WHERE id = $2`, [customerId, academyId]);
        }

        // Get plan details
        let plan;
        if (['pro', 'free', 'elite', 'agency-basic', 'agency-pro'].includes(newPlanId)) {
          const fallbackPlans = getFallbackPlans(isAgency ? 'AGENCY' : 'ACADEMY');
          plan = fallbackPlans.find(p => p.id === newPlanId);
        } else {
          const planResult = await query('SELECT * FROM subscription_plans WHERE id = $1', [newPlanId]);
          if (planResult.rows.length > 0) plan = planResult.rows[0];
        }

        if (!plan) throw new Error('Invalid plan selected');

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
                  name: `${plan.name} Plan`,
                  description: `Subscription upgrade to ${plan.name}`,
                },
                unit_amount: Math.round(Number(plan.price) * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: STRIPE_CONFIG.successUrl,
          cancel_url: STRIPE_CONFIG.cancelUrl,
          metadata: {
            orgId: academyId,
            planId: newPlanId,
            type: isAgency ? 'AGENCY' : 'ACADEMY'
          }
        });

        return res.json({
          success: true,
          url: session.url,
          message: 'Redirecting to checkout...'
        });
      } catch (stripeError: any) {
        console.error('Stripe session creation error:', stripeError);
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize payment gateway',
          error: stripeError.message
        });
      }
    }

    const result = await transaction(async (client) => {
      // Get current subscription
      const currentSubQuery = `
        SELECT s.*, p.name as current_plan_name
        FROM ${subTable} s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.${orgIdColumn} = $1 AND s.status = 'ACTIVE'
      `;
      const currentSubResult = await client.query(currentSubQuery, [academyId]);

      const currentSubscription = currentSubResult.rows.length > 0 ? currentSubResult.rows[0] : null;

      // Get new plan details
      let newPlan;
      
      // Check if it's a predefined plan ID (fallback plans)
      if (['pro', 'free', 'elite', 'agency-basic', 'agency-pro'].includes(newPlanId)) {
        const fallbackPlans = getFallbackPlans(isAgency ? 'AGENCY' : 'ACADEMY');
        newPlan = fallbackPlans.find(p => p.id === newPlanId);
      } else {
        // Check DB
        const newPlanQuery = `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`;
        const newPlanResult = await client.query(newPlanQuery, [newPlanId]);
        if (newPlanResult.rows.length > 0) {
          newPlan = newPlanResult.rows[0];
        }
      }

      if (!newPlan) {
        throw new Error('Invalid or inactive subscription plan');
      }

      // If there's an existing subscription, deactivate it
      if (currentSubscription) {
        await client.query(
          `UPDATE ${subTable} SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
          [currentSubscription.id]
        );
      }

      // Create new subscription
      const newSubscriptionId = uuidv4();
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const newSubQuery = `
        INSERT INTO ${subTable} (
          id, ${orgIdColumn}, plan_id, status, start_date, end_date, 
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

      // Create payment record
      const paymentId = uuidv4();
      const amount = newPlan.price;

      await client.query(`
        INSERT INTO subscription_payments (
          id, subscription_id, amount, currency, payment_method, 
          payment_reference, status, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        paymentId,
        newSubscriptionId,
        amount,
        'USD',
        paymentMethod || 'CARD',
        paymentReference || 'DASHBOARD_UPGRADE',
        paymentMethod === 'CASH' ? 'PENDING' : 'COMPLETED',
        notes
      ]);

      return { newSubscription, newPlan, paymentId };
    });

    // If the payment is completed immediately (i.e. not PENDING/CASH), send email
    const isPaymentCompleted = result.newPlan.price === 0 || paymentMethod !== 'CASH';
    if (isPaymentCompleted) {
      try {
        const orgResult = await query(
          `SELECT name, email FROM ${orgTable} WHERE id = $1`,
          [academyId]
        );
        if (orgResult.rows.length > 0 && orgResult.rows[0].email) {
          const org = orgResult.rows[0];
          await emailService.sendPaymentConfirmationEmail(
            org.email,
            org.name,
            Number(result.newPlan.price),
            'USD',
            result.newPlan.name,
            paymentReference || 'DASHBOARD_UPGRADE',
            new Date()
          );
          console.log(`Payment confirmation email sent to ${org.email} for mock/direct upgrade`);
        }
      } catch (emailErr) {
        console.error('Error sending upgrade confirmation email:', emailErr);
      }
    }

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

    let emailDetails: {
      email: string;
      name: string;
      amount: number;
      currency: string;
      planName: string;
      paymentReference: string;
    } | null = null;

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

      // If payment failed, deactivate the subscription in whichever table it resides
      if (status === 'FAILED') {
        // Try updating academy_subscriptions
        const acadUpdate = await client.query(
          `UPDATE academy_subscriptions SET status = 'CANCELLED' WHERE id = $1 RETURNING id`,
          [payment.subscription_id]
        );
        
        // If not found in academies, try agencies
        if (acadUpdate.rows.length === 0) {
          await client.query(
            `UPDATE agency_subscriptions SET status = 'CANCELLED' WHERE id = $1`,
            [payment.subscription_id]
          );
        }
      }

      if (status === 'COMPLETED') {
        // Get subscription and org info
        let subInfoResult = await client.query(`
          SELECT 
            a.name as org_name,
            a.email as org_email,
            p.name as plan_name
          FROM academy_subscriptions s
          JOIN academies a ON s.academy_id = a.id
          JOIN subscription_plans p ON s.plan_id = p.id
          WHERE s.id = $1
        `, [payment.subscription_id]);

        if (subInfoResult.rows.length === 0) {
          subInfoResult = await client.query(`
            SELECT 
              a.name as org_name,
              a.email as org_email,
              p.name as plan_name
            FROM agency_subscriptions s
            JOIN agencies a ON s.agency_id = a.id
            JOIN subscription_plans p ON s.plan_id = p.id
            WHERE s.id = $1
          `, [payment.subscription_id]);
        }

        if (subInfoResult.rows.length > 0 && subInfoResult.rows[0].org_email) {
          const info = subInfoResult.rows[0];
          emailDetails = {
            email: info.org_email,
            name: info.org_name,
            amount: Number(payment.amount),
            currency: payment.currency || 'USD',
            planName: info.plan_name,
            paymentReference: payment.payment_reference || payment.id
          };
        }
      }

      return payment;
    });

    // Send email outside the transaction after successful commit
    if (emailDetails) {
      try {
        await emailService.sendPaymentConfirmationEmail(
          emailDetails.email,
          emailDetails.name,
          emailDetails.amount,
          emailDetails.currency,
          emailDetails.planName,
          emailDetails.paymentReference,
          new Date()
        );
        console.log(`Cash payment confirmation email sent to ${emailDetails.email}`);
      } catch (emailErr) {
        console.error('Error sending cash payment confirmation email:', emailErr);
      }
    }

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
    const orgId = (req.query.academyId || req.query.orgId || req.query.agencyId) as string;

    if (!orgId || orgId === 'undefined' || orgId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Check if it's an agency or academy (based on query param or we can check both tables)
    // For simplicity, let's try to find in both or use a UNION
    const historyQuery = `
      SELECT 
        h.id, h.action, h.notes, h.created_at,
        p1.name as previous_plan_name,
        p2.name as new_plan_name
      FROM subscription_history h
      LEFT JOIN academy_subscriptions s1 ON h.subscription_id = s1.id
      LEFT JOIN agency_subscriptions s2 ON h.subscription_id = s2.id
      LEFT JOIN subscription_plans p1 ON h.old_plan_id = p1.id
      LEFT JOIN subscription_plans p2 ON h.new_plan_id = p2.id
      WHERE s1.academy_id = $1 OR s2.agency_id = $1
      ORDER BY h.created_at DESC
      LIMIT 20
    `;

    const result = await query(historyQuery, [orgId]);

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

    const user = (req as any).user;
    const isAgency = user?.role === 'AGENCY_ADMIN';
    const subTable = isAgency ? 'agency_subscriptions' : 'academy_subscriptions';
    const orgIdColumn = isAgency ? 'agency_id' : 'academy_id';

    // Get current active subscription
    const currentSubscriptionQuery = `
      SELECT s.*, sp.name as plan_name, sp.price
      FROM ${subTable} s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.${orgIdColumn} = $1 AND s.status = 'ACTIVE'
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
      UPDATE ${subTable} 
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

// Create Subscription Plan (Admin only)
export const handleCreatePlan: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create plans'
      });
    }

    const { 
      name, description, price, currency, billing_cycle, 
      player_limit, storage_limit, features, is_active, is_free, sort_order, target_type 
    } = req.body;

    const id = uuidv4();
    const insertQuery = `
      INSERT INTO subscription_plans (
        id, name, description, price, currency, billing_cycle, 
        player_limit, storage_limit, features, is_active, is_free, sort_order, target_type,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;

    const result = await query(insertQuery, [
      id, name, description, price || 0, currency || 'USD', billing_cycle || 'MONTHLY',
      player_limit || 0, storage_limit || 5368709120, JSON.stringify(features || []), is_active !== false, is_free === true, 
      sort_order || 0, target_type || 'ACADEMY'
    ]);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
}

// Update Subscription Plan (Admin only)
export const handleUpdatePlan: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update plans'
      });
    }

    // Check if ID is a valid UUID to prevent Postgres cast errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found (Invalid ID format)'
      });
    }

    const { 
      name, description, price, currency, billing_cycle, 
      player_limit, storage_limit, features, is_active, is_free, sort_order, target_type 
    } = req.body;

    const updateQuery = `
      UPDATE subscription_plans 
      SET name = $1, description = $2, price = $3, currency = $4, 
          billing_cycle = $5, player_limit = $6, storage_limit = $7, features = $8, 
          is_active = $9, is_free = $10, sort_order = $11, target_type = $12,
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    const result = await query(updateQuery, [
      name, description, price, currency, billing_cycle,
      player_limit, storage_limit, JSON.stringify(features), is_active, is_free, 
      sort_order, target_type, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message
    });
  }
}

// Delete Subscription Plan (Admin only)
export const handleDeletePlan: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete plans'
      });
    }

    // Check if ID is a valid UUID to prevent Postgres cast errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found (Invalid ID format)'
      });
    }

    // Fetch plan details to check for Stripe IDs before deletion
    const planResult = await query('SELECT stripe_product_id, stripe_price_id FROM subscription_plans WHERE id = $1', [id]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    const plan = planResult.rows[0];

    // Archive in Stripe if IDs exist
    if (plan.stripe_product_id || plan.stripe_price_id) {
      try {
        // Load Stripe key from settings
        const settingsResult = await query(
          `SELECT value FROM system_settings WHERE key = 'stripe.secret_key'`
        );
        const secretKey = settingsResult.rows[0]?.value || process.env.STRIPE_SECRET_KEY;
        
        if (secretKey) {
          const stripe = new (await import('stripe')).default(secretKey, { apiVersion: '2025-10-29.clover' });
          
          if (plan.stripe_price_id) {
            await stripe.prices.update(plan.stripe_price_id, { active: false }).catch(e => console.warn('Stripe price archive failed:', e.message));
          }
          if (plan.stripe_product_id) {
            await stripe.products.update(plan.stripe_product_id, { active: false }).catch(e => console.warn('Stripe product archive failed:', e.message));
          }
        }
      } catch (error: any) {
        console.warn('Failed to archive plan in Stripe:', error.message);
      }
    }

    // Permanent Deletion: Remove all referencing records first
    // 1. Clear subscription history references
    await query(
      'DELETE FROM subscription_history WHERE old_plan_id = $1 OR new_plan_id = $1',
      [id]
    );

    // 2. Delete subscriptions for academies/agencies using this plan
    await query('DELETE FROM academy_subscriptions WHERE plan_id = $1', [id]);
    await query('DELETE FROM agency_subscriptions WHERE plan_id = $1', [id]);

    // 3. Delete player purchases referencing this plan
    await query('DELETE FROM player_purchases WHERE plan_type = $1', [id]);

    // 4. Finally delete the plan itself
    const deleteQuery = 'DELETE FROM subscription_plans WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan and all associated records have been permanently deleted',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
}

// Define the router and routes
const subscriptionRouter = Router();
subscriptionRouter.get('/current', authenticateToken, handleGetSubscription);
subscriptionRouter.get('/plans', handleGetPlans);
subscriptionRouter.post('/plans', authenticateToken, handleCreatePlan);
subscriptionRouter.put('/plans/:id', authenticateToken, handleUpdatePlan);
subscriptionRouter.delete('/plans/:id', authenticateToken, handleDeletePlan);
subscriptionRouter.post('/upgrade', authenticateToken, handleUpgradePlan);
subscriptionRouter.post('/process-payment', authenticateToken, handleProcessCashPayment);
subscriptionRouter.get('/history', authenticateToken, handleGetSubscriptionHistory);
subscriptionRouter.post('/cancel', authenticateToken, handleCancelSubscription);

export default subscriptionRouter;