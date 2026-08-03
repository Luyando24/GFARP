import { Request, Response, Router, type RequestHandler } from 'express';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import {
  authenticateToken,
  canAccessOrganizationForRequest,
  requireAdmin,
} from '../middleware/auth.js';
import { getStripe, createStripeCustomer, STRIPE_CONFIG } from '../lib/stripe.js';
import { emailService } from '../lib/email-service.js';
import { sendSubscriptionPaymentReceiptByPaymentId } from '../lib/payment-receipt.js';
import { addBillingCycleToDate } from '../../shared/calendar-date.js';

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

    const isAgency = role === 'agency_admin';
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

    const playerCountQuery = `SELECT COUNT(*) as player_count FROM players WHERE ${orgIdColumn} = $1 AND is_active = true`;
    const playerResult = await query(playerCountQuery, [orgId]);
    const playerCount = parseInt(playerResult.rows[0].player_count);

    // Having no subscription is a valid account state, not a missing API resource.
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          subscription: null,
          limits: { playerLimit: 0 },
          usage: { playerCount, playerUsagePercentage: 0 }
        }
      });
    }

    const subscription = result.rows[0];

    // Calculate usage statistics

    const daysRemaining = subscription.end_date
      ? Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const playerUsagePercentage = subscription.player_limit > 0
      ? (playerCount / subscription.player_limit) * 100
      : 0;

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
          daysRemaining: daysRemaining === null ? null : Math.max(0, daysRemaining),
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

// Get available subscription plans
export const handleGetPlans: RequestHandler = async (req, res) => {
  try {
    const requestedTarget = Array.isArray(req.query.targetType)
      ? req.query.targetType[0]
      : req.query.targetType;
    const targetType = String(requestedTarget || 'ACADEMY').toUpperCase();

    if (!['ACADEMY', 'AGENCY', 'INDIVIDUAL'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription target type',
      });
    }

    const includeInactive = req.query.includeInactive === 'true';
    const result = await query(
      `SELECT id, name, description, price, currency, billing_cycle,
              player_limit, storage_limit, features, is_active, is_free,
              sort_order, target_type
       FROM subscription_plans
       WHERE target_type = $1
         AND ($2::boolean = true OR is_active = true)
       ORDER BY sort_order ASC`,
      [targetType, includeInactive],
    );

    const plans = result.rows.map((plan) => {
      let features = plan.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch {
          features = [];
        }
      }

      return {
        ...plan,
        price: Number(plan.price),
        features: Array.isArray(features) ? features : [],
        storage_limit: Number(plan.storage_limit || 0),
      };
    });

    return res.json({ success: true, data: plans });
  } catch (error: any) {
    console.error('[SUBSCRIPTION] Failed to get plans:', error);
    return res.status(503).json({
      success: false,
      message: 'Subscription plans are temporarily unavailable',
    });
  }
};
// Upgrade Subscription Plan
export const handleUpgradePlan: RequestHandler = async (req, res) => {
  try {
    const { academyId, newPlanId, paymentMethod, paymentReference, promoCodeId, notes } = req.body;

    if (!academyId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: 'Academy ID and new plan ID are required'
      });
    }

    if (!['CARD', 'CASH'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Payment method must be CARD or CASH',
      });
    }

    const user = (req as any).user;
    if (!(await canAccessOrganizationForRequest(user, academyId))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this organization'
      });
    }

    const isAgency = user?.role === 'agency_admin';
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
        const planResult = await query(
          'SELECT * FROM subscription_plans WHERE id = $1 AND target_type = $2 AND is_active = true',
          [newPlanId, isAgency ? 'AGENCY' : 'ACADEMY']
        );
        if (planResult.rows.length > 0) plan = planResult.rows[0];

        if (!plan) throw new Error('Invalid plan selected');

        if (Number(plan.price) > 0) {
          let checkoutPrice = Number(plan.price);
          let appliedPromoCodeId: string | null = null;
          if (promoCodeId) {
            const promoResult = await query(
              `SELECT id, discount_percent
               FROM promo_codes
               WHERE id = $1 AND status = 'active'
                 AND (expires_at IS NULL OR expires_at > NOW())
                 AND (max_uses IS NULL OR used_count < max_uses)`,
              [promoCodeId],
            );
            if (promoResult.rows.length === 0) {
              return res.status(400).json({ success: false, message: 'Promo code is invalid or expired' });
            }
            const discountPercent = Math.min(100, Math.max(0, Number(promoResult.rows[0].discount_percent)));
            checkoutPrice = checkoutPrice * (1 - discountPercent / 100);
            appliedPromoCodeId = promoResult.rows[0].id;
          }
          if (checkoutPrice < 0.5) {
            return res.status(400).json({
              success: false,
              message: 'The discounted amount is below the minimum card payment amount',
            });
          }
          const billingCycle = String(plan.billing_cycle || 'MONTHLY').toUpperCase();
          const isRecurring = billingCycle !== 'LIFETIME';
          const stripe = getStripe();
          const lineItem = plan.stripe_price_id && !appliedPromoCodeId
            ? { price: plan.stripe_price_id, quantity: 1 }
            : {
                price_data: {
                  currency: plan.currency?.toLowerCase() || 'usd',
                  product_data: {
                    name: `${plan.name} Plan`,
                    description: `Subscription upgrade to ${plan.name}`,
                  },
                  unit_amount: Math.round(checkoutPrice * 100),
                  ...(isRecurring ? {
                    recurring: { interval: billingCycle === 'YEARLY' ? 'year' as const : 'month' as const }
                  } : {}),
                },
                quantity: 1,
              };
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [lineItem],
            mode: isRecurring ? 'subscription' : 'payment',
            success_url: STRIPE_CONFIG.successUrl,
            cancel_url: STRIPE_CONFIG.cancelUrl,
            metadata: {
              orgId: academyId,
              planId: newPlanId,
              type: isAgency ? 'AGENCY' : 'ACADEMY',
              ...(appliedPromoCodeId ? { promoCodeId: appliedPromoCodeId } : {}),
            }
          });

          return res.json({
            success: true,
            url: session.url,
            message: 'Redirecting to checkout...'
          });
        }
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
      
      const newPlanQuery = `SELECT * FROM subscription_plans WHERE id = $1 AND target_type = $2 AND is_active = true`;
      const newPlanResult = await client.query(newPlanQuery, [newPlanId, isAgency ? 'AGENCY' : 'ACADEMY']);
      if (newPlanResult.rows.length > 0) {
        newPlan = newPlanResult.rows[0];
      }

      if (!newPlan) {
        throw new Error('Invalid or inactive subscription plan');
      }

      const amount = Number(newPlan.price || 0);
      const isCashPending = amount > 0 && paymentMethod === 'CASH';

      // Keep the existing plan active until a cash payment is approved.
      if (currentSubscription && !isCashPending) {
        await client.query(
          `UPDATE ${subTable} SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
          [currentSubscription.id]
        );
      }

      // Create new subscription
      const newSubscriptionId = uuidv4();
      const startDate = new Date();
      const endDate = addBillingCycleToDate(startDate, newPlan.billing_cycle);
      const subscriptionStatus = isCashPending ? 'PENDING' : 'ACTIVE';
      const autoRenew = String(newPlan.billing_cycle).toUpperCase() !== 'LIFETIME';

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
        subscriptionStatus,
        startDate,
        endDate,
        autoRenew
      ]);

      const newSubscription = newSubResult.rows[0];

      // Log subscription history
      const historyId = uuidv4();
      const action = currentSubscription ? 'UPGRADED' : 'CREATED';
      const historyNotes = isCashPending
        ? `Pending cash payment for ${newPlan.name} plan`
        : currentSubscription
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
        historyNotes
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
        newSubscriptionId,
        amount,
        'USD',
        paymentMethod || 'CARD',
        paymentReference || 'DASHBOARD_UPGRADE',
        isCashPending ? 'PENDING' : 'COMPLETED',
        notes
      ]);

      return { newSubscription, newPlan, paymentId };
    });

    // If the payment is completed immediately (i.e. not PENDING/CASH), send email
    const isPaymentCompleted = Number(result.newPlan.price) === 0 || paymentMethod !== 'CASH';
    if (isPaymentCompleted && result.paymentId) {
      try {
        const sent = await sendSubscriptionPaymentReceiptByPaymentId(result.paymentId);
        if (sent) {
          console.log(`Payment confirmation email sent for payment ${result.paymentId}`);
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
        paymentStatus: Number(result.newPlan.price) > 0
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
    const { paymentId, status, notes } = req.body;
    const processedBy = req.user?.id;

    if (!paymentId || !status || !processedBy) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and status are required'
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
      const subscriptionSources = [
        { table: 'academy_subscriptions', idColumn: 'academy_id' },
        { table: 'agency_subscriptions', idColumn: 'agency_id' },
      ] as const;
      let subscriptionContext: {
        table: 'academy_subscriptions' | 'agency_subscriptions';
        idColumn: 'academy_id' | 'agency_id';
        subscription: any;
      } | null = null;

      for (const source of subscriptionSources) {
        const subscriptionResult = await client.query(
          `SELECT s.*, p.billing_cycle
           FROM ${source.table} s
           JOIN subscription_plans p ON p.id = s.plan_id
           WHERE s.id = $1
           FOR UPDATE`,
          [payment.subscription_id]
        );
        if (subscriptionResult.rows.length > 0) {
          subscriptionContext = { ...source, subscription: subscriptionResult.rows[0] };
          break;
        }
      }

      if (!subscriptionContext) {
        throw new Error('Subscription linked to this payment was not found');
      }

      const { table, idColumn, subscription } = subscriptionContext;
      if (status === 'COMPLETED') {
        const startDate = new Date();
        const endDate = addBillingCycleToDate(startDate, subscription.billing_cycle);

        await client.query(
          `UPDATE ${table}
           SET status = 'CANCELLED', auto_renew = false, updated_at = NOW()
           WHERE ${idColumn} = $1 AND status = 'ACTIVE' AND id <> $2`,
          [subscription[idColumn], subscription.id]
        );

        await client.query(
          `UPDATE ${table}
           SET status = 'ACTIVE', start_date = $1, end_date = $2,
               auto_renew = $3, activated_by = $4, activated_at = NOW(), updated_at = NOW()
           WHERE id = $5`,
          [
            startDate,
            endDate,
            String(subscription.billing_cycle).toUpperCase() !== 'LIFETIME',
            processedBy,
            subscription.id,
          ]
        );
      } else {
        await client.query(
          `UPDATE ${table}
           SET status = 'CANCELLED', auto_renew = false, updated_at = NOW()
           WHERE id = $1`,
          [subscription.id]
        );
      }

      return payment;
    });

    if (status === 'COMPLETED' && result.id) {
      try {
        const sent = await sendSubscriptionPaymentReceiptByPaymentId(result.id);
        if (sent) {
          console.log(`Cash payment confirmation email sent for payment ${result.id}`);
        }
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

    if (!(await canAccessOrganizationForRequest(req.user, orgId))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this organization'
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
    if (!(await canAccessOrganizationForRequest(user, academyId))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this organization'
      });
    }

    const isAgency = user?.role === 'agency_admin';
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

// Manually Send Receipt (Admin only)
export const handleSendReceiptManually: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manually send receipts'
      });
    }

    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(paymentId);

    let payment = null;
    let isPlayerPurchase = false;
    let purchase = null;

    if (isUuid) {
      // 1. Try to find in subscription_payments by id
      const subPaymentResult = await query('SELECT * FROM subscription_payments WHERE id = $1', [paymentId]);
      if (subPaymentResult.rows.length > 0) {
        payment = subPaymentResult.rows[0];
      } else {
        // Try in player_purchases by id
        const playerPurchaseResult = await query(`
          SELECT 
            pur.id, pur.amount, pur.plan_type, pur.status, pur.stripe_session_id, pur.created_at,
            p.first_name, p.last_name, p.email
          FROM player_purchases pur
          JOIN individual_players p ON pur.player_id = p.id
          WHERE pur.id = $1
        `, [paymentId]);
        if (playerPurchaseResult.rows.length > 0) {
          purchase = playerPurchaseResult.rows[0];
          isPlayerPurchase = true;
        }
      }
    } else {
      // Not a UUID: try to find by stripe identifier
      const subPaymentResult = await query(`
        SELECT * FROM subscription_payments 
        WHERE stripe_invoice_id = $1 OR payment_reference = $1
      `, [paymentId]);
      if (subPaymentResult.rows.length > 0) {
        payment = subPaymentResult.rows[0];
      } else {
        // Check player_purchases by stripe_session_id
        const playerPurchaseResult = await query(`
          SELECT 
            pur.id, pur.amount, pur.plan_type, pur.status, pur.stripe_session_id, pur.created_at,
            p.first_name, p.last_name, p.email
          FROM player_purchases pur
          JOIN individual_players p ON pur.player_id = p.id
          WHERE pur.stripe_session_id = $1
        `, [paymentId]);
        if (playerPurchaseResult.rows.length > 0) {
          purchase = playerPurchaseResult.rows[0];
          isPlayerPurchase = true;
        }
      }
    }

    if (payment) {
      if (payment.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot send confirmation for a non-completed payment'
        });
      }

      // Check academy subscriptions first
      let subInfoResult = await query(`
        SELECT 
          a.name as org_name,
          a.email as org_email,
          p.name as plan_name
        FROM academy_subscriptions s
        JOIN academies a ON s.academy_id = a.id
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.id = $1
      `, [payment.subscription_id]);

      // If not academy, check agency subscriptions
      if (subInfoResult.rows.length === 0) {
        subInfoResult = await query(`
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

      if (subInfoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription or organization details not found for this payment'
        });
      }

      const orgInfo = subInfoResult.rows[0];
      if (!orgInfo.org_email) {
        return res.status(400).json({
          success: false,
          message: 'Organization email is not defined'
        });
      }

      // Ensure email service uses the latest Resend sender configuration
      await emailService.initializeFromDatabase();

      const emailSent = await emailService.sendPaymentConfirmationEmail(
        orgInfo.org_email,
        orgInfo.org_name,
        Number(payment.amount),
        payment.currency || 'USD',
        orgInfo.plan_name,
        payment.payment_reference || payment.id,
        new Date(payment.created_at),
        payment.stripe_invoice_id || undefined
      );

      if (emailSent) {
        return res.json({
          success: true,
          message: 'Payment confirmation email sent successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send receipt email via SMTP'
        });
      }
    }

    if (isPlayerPurchase && purchase) {
      if (purchase.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot send confirmation for a non-completed player purchase'
        });
      }

      if (!purchase.email) {
        return res.status(400).json({
          success: false,
          message: 'Player email is not defined'
        });
      }

      // Ensure email service uses the latest Resend sender configuration
      await emailService.initializeFromDatabase();

      const recipientName = `${purchase.first_name || ''} ${purchase.last_name || ''}`.trim() || 'Player';
      const planName = `${purchase.plan_type.charAt(0).toUpperCase() + purchase.plan_type.slice(1)} Plan`;

      const emailSent = await emailService.sendPaymentConfirmationEmail(
        purchase.email,
        recipientName,
        Number(purchase.amount),
        'USD',
        planName,
        purchase.stripe_session_id || purchase.id,
        new Date(purchase.created_at),
        purchase.stripe_session_id || undefined
      );

      if (emailSent) {
        return res.json({
          success: true,
          message: 'Payment confirmation email sent successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send receipt email via SMTP'
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Transaction not found in subscription payments or player purchases'
    });

  } catch (error: any) {
    console.error('Send manual receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send receipt',
      error: error.message
    });
  }
};

// Define the router and routes
const subscriptionRouter = Router();
subscriptionRouter.get('/current', authenticateToken, handleGetSubscription);
subscriptionRouter.get('/plans', handleGetPlans);
subscriptionRouter.post('/plans', authenticateToken, requireAdmin, handleCreatePlan);
subscriptionRouter.put('/plans/:id', authenticateToken, requireAdmin, handleUpdatePlan);
subscriptionRouter.delete('/plans/:id', authenticateToken, requireAdmin, handleDeletePlan);
subscriptionRouter.post('/upgrade', authenticateToken, handleUpgradePlan);
subscriptionRouter.post('/process-payment', authenticateToken, requireAdmin, handleProcessCashPayment);
subscriptionRouter.get('/history', authenticateToken, handleGetSubscriptionHistory);
subscriptionRouter.post('/cancel', authenticateToken, handleCancelSubscription);
subscriptionRouter.post('/send-receipt', authenticateToken, requireAdmin, handleSendReceiptManually);

export default subscriptionRouter;
