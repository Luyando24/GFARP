import { Router, RequestHandler } from 'express';
import Stripe from 'stripe';
import { getStripe, STRIPE_WEBHOOK_SECRET } from '../lib/stripe.js';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import {
  sendPlayerPurchaseReceipt,
  sendSubscriptionPaymentReceiptByPaymentId,
} from '../lib/payment-receipt.js';
import { addBillingCycleToDate } from '../../shared/calendar-date.js';

const router = Router();

// Webhook signature verification middleware
const verifyWebhookSignature: RequestHandler = (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('Missing Stripe signature header');
    return res.status(400).send('Missing signature');
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    req.body = event; // Replace raw body with parsed event
    next();
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Main webhook handler (mounted at /api/stripe/webhooks)
const handleWebhook: RequestHandler = async (req, res) => {
  const event = req.body as Stripe.Event;

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook ${event.type}:`, error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

// Register route
router.post('/', verifyWebhookSignature, handleWebhook);

type SubscriptionContext = {
  table: 'academy_subscriptions' | 'agency_subscriptions';
  idColumn: 'academy_id' | 'agency_id';
  kind: 'ACADEMY' | 'AGENCY';
  subscription: any;
};

function stripeObjectId(value: any): string | null {
  if (typeof value === 'string') return value;
  return value?.id ? String(value.id) : null;
}

function localSubscriptionStatus(status: unknown): 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' {
  switch (String(status || '').toLowerCase()) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'canceled':
      return 'CANCELLED';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'SUSPENDED';
    default:
      return 'PENDING';
  }
}

async function findSubscriptionByStripeId(
  client: any,
  stripeSubscriptionId: string,
  lock = false,
): Promise<SubscriptionContext | null> {
  const sources = [
    { table: 'academy_subscriptions', idColumn: 'academy_id', kind: 'ACADEMY' },
    { table: 'agency_subscriptions', idColumn: 'agency_id', kind: 'AGENCY' },
  ] as const;

  for (const source of sources) {
    const result = await client.query(
      `SELECT s.*
       FROM ${source.table} s
       WHERE s.stripe_subscription_id = $1
       ${lock ? 'FOR UPDATE' : ''}`,
      [stripeSubscriptionId],
    );
    if (result.rows.length > 0) {
      return { ...source, subscription: result.rows[0] };
    }
  }
  return null;
}

async function updateLocalSubscriptionFromStripe(
  client: any,
  context: SubscriptionContext,
  stripeSubscription: any,
  forcedStatus?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
) {
  const nextStatus = forcedStatus || localSubscriptionStatus(stripeSubscription.status);
  const current = context.subscription;
  const periodStart = stripeSubscription.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000)
    : null;
  const periodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null;

  if (nextStatus === 'ACTIVE') {
    await client.query(
      `UPDATE ${context.table}
       SET status = 'CANCELLED', auto_renew = false, updated_at = NOW()
       WHERE ${context.idColumn} = $1 AND status = 'ACTIVE' AND id <> $2`,
      [current[context.idColumn], current.id],
    );
  }

  await client.query(
    `UPDATE ${context.table}
     SET status = $1,
         start_date = COALESCE($2, start_date),
         end_date = COALESCE($3, end_date),
         auto_renew = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [
      nextStatus,
      periodStart,
      periodEnd,
      nextStatus === 'ACTIVE' && !stripeSubscription.cancel_at_period_end,
      current.id,
    ],
  );

  if (current.status !== nextStatus) {
    const action = nextStatus === 'ACTIVE'
      ? 'ACTIVATED'
      : nextStatus === 'CANCELLED'
        ? 'CANCELLED'
        : nextStatus === 'SUSPENDED'
          ? 'SUSPENDED'
          : 'CREATED';
    await client.query(
      `INSERT INTO subscription_history (
         id, subscription_id, action, old_status, new_status, old_plan_id,
         new_plan_id, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, NOW())`,
      [
        uuidv4(),
        current.id,
        action,
        current.status,
        nextStatus,
        current.plan_id,
        'Stripe subscription status update',
      ],
    );
  }
}

async function handleSubscriptionCreated(subscription: any) {
  const stripeId = stripeObjectId(subscription);
  if (!stripeId) return;

  await transaction(async (client) => {
    const context = await findSubscriptionByStripeId(client, stripeId, true);
    if (!context) {
      console.warn(`Local subscription not yet available for Stripe subscription ${stripeId}`);
      return;
    }
    await updateLocalSubscriptionFromStripe(client, context, subscription);
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const stripeId = stripeObjectId(subscription);
  if (!stripeId) return;

  await transaction(async (client) => {
    const context = await findSubscriptionByStripeId(client, stripeId, true);
    if (!context) {
      console.warn(`Local subscription not found for Stripe update ${stripeId}`);
      return;
    }
    await updateLocalSubscriptionFromStripe(client, context, subscription);
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  const stripeId = stripeObjectId(subscription);
  if (!stripeId) return;

  await transaction(async (client) => {
    const context = await findSubscriptionByStripeId(client, stripeId, true);
    if (!context) return;
    await updateLocalSubscriptionFromStripe(client, context, subscription, 'CANCELLED');
  });
}

async function handlePaymentSucceeded(invoice: any) {
  const stripeSubscriptionId = stripeObjectId(invoice.subscription);
  if (!stripeSubscriptionId) return;
  let paymentId: string | null = null;

  await transaction(async (client) => {
    const context = await findSubscriptionByStripeId(client, stripeSubscriptionId, true);
    if (!context) {
      console.warn(`Subscription not found for invoice ${invoice.id}`);
      return;
    }

    await updateLocalSubscriptionFromStripe(
      client,
      context,
      {
        id: stripeSubscriptionId,
        status: 'active',
        current_period_start: invoice.period_start,
        current_period_end: invoice.period_end,
        cancel_at_period_end: false,
      },
      'ACTIVE',
    );

    const existingPayment = await client.query(
      'SELECT id FROM subscription_payments WHERE stripe_invoice_id = $1',
      [invoice.id],
    );
    if (existingPayment.rows.length > 0) {
      paymentId = existingPayment.rows[0].id;
      return;
    }

    const candidatePaymentId = uuidv4();
    const insertedPayment = await client.query(
      `INSERT INTO subscription_payments (
         id, subscription_id, amount, currency, payment_method,
         payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'CARD', $5, $6, 'COMPLETED', $7, NOW(), NOW())
       ON CONFLICT (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        candidatePaymentId,
        context.subscription.id,
        Number(invoice.amount_paid || 0) / 100,
        String(invoice.currency || 'usd').toUpperCase(),
        stripeObjectId(invoice.payment_intent) || invoice.id,
        invoice.id,
        'Payment processed via Stripe webhook',
      ],
    );

    if (insertedPayment.rows.length === 0) {
      const racedPayment = await client.query(
        'SELECT id FROM subscription_payments WHERE stripe_invoice_id = $1',
        [invoice.id],
      );
      paymentId = racedPayment.rows[0]?.id || null;
      return;
    }
    paymentId = candidatePaymentId;

    if (context.kind === 'ACADEMY') {
      const academyInfo = await client.query(
        'SELECT sales_agent_id FROM academies WHERE id = $1',
        [context.subscription.academy_id],
      );
      const agentId = academyInfo.rows[0]?.sales_agent_id;
      if (agentId) {
        const agent = await client.query(
          'SELECT commission_rate FROM sales_agents WHERE id = $1',
          [agentId],
        );
        const rate = Number(agent.rows[0]?.commission_rate || 0);
        const commissionAmount = (Number(invoice.amount_paid || 0) / 100) * rate / 100;
        if (commissionAmount > 0) {
          await client.query(
            `INSERT INTO commissions (
               id, sales_agent_id, academy_id, amount, currency, status, notes,
               created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW())`,
            [
              uuidv4(),
              agentId,
              context.subscription.academy_id,
              commissionAmount.toFixed(2),
              String(invoice.currency || 'usd').toUpperCase(),
              `Commission from subscription payment (Invoice: ${invoice.id})`,
            ],
          );
        }
      }
    }
  });

  if (paymentId) {
    await sendSubscriptionPaymentReceiptByPaymentId(paymentId);
  }
}

async function handlePaymentFailed(invoice: any) {
  const stripeSubscriptionId = stripeObjectId(invoice.subscription);
  if (!stripeSubscriptionId) return;

  await transaction(async (client) => {
    const context = await findSubscriptionByStripeId(client, stripeSubscriptionId, true);
    if (!context) {
      console.warn(`Subscription not found for failed invoice ${invoice.id}`);
      return;
    }

    const insertedPayment = await client.query(
      `INSERT INTO subscription_payments (
         id, subscription_id, amount, currency, payment_method,
         payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'CARD', $5, $6, 'FAILED', $7, NOW(), NOW())
       ON CONFLICT (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        uuidv4(),
        context.subscription.id,
        Number(invoice.amount_due || 0) / 100,
        String(invoice.currency || 'usd').toUpperCase(),
        stripeObjectId(invoice.payment_intent) || invoice.id,
        invoice.id,
        `Payment failed: ${invoice.last_finalization_error?.message || 'Unknown error'}`,
      ],
    );
    await updateLocalSubscriptionFromStripe(
      client,
      context,
      { id: stripeSubscriptionId, status: 'past_due', cancel_at_period_end: false },
      'SUSPENDED',
    );
  });
}
async function handleCustomerCreated(customer: any) {
  console.log('Processing customer created:', customer.id);

  try {
    for (const table of ['academies', 'agencies'] as const) {
      const result = await query(`
        UPDATE ${table}
        SET stripe_customer_id = $1, updated_at = NOW()
        WHERE email = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id = '')
        RETURNING id, name
      `, [customer.id, customer.email]);

      if (result.rows.length > 0) {
        console.log(`Customer ${customer.id} linked to ${table} record ${result.rows[0].id}`);
        break;
      }
    }
  } catch (error: any) {
    console.error('Error handling customer created:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const academyId = paymentIntent.metadata?.academyId;
  if (!academyId) return;

  await query(
    `INSERT INTO financial_transactions (
       academy_id, transaction_type, category, amount, description,
       transaction_date, payment_method, reference_number, status,
       stripe_payment_intent_id, created_at, updated_at
     ) VALUES ($1, 'income', 'One-time payment', $2, $3, CURRENT_DATE,
               'CARD', $4, 'completed', $4, NOW(), NOW())
     ON CONFLICT (stripe_payment_intent_id) DO NOTHING`,
    [
      academyId,
      Number(paymentIntent.amount_received || paymentIntent.amount || 0) / 100,
      paymentIntent.metadata.description || 'One-time payment',
      paymentIntent.id,
    ],
  );
}


async function persistOrganizationCheckout(session: any): Promise<string | null> {
  const metadata = session.metadata || {};
  const organizationId = metadata.orgId || metadata.academyId || metadata.entityId;
  const planId = metadata.planId;
  if (!organizationId || !planId) return null;

  const isAgency = metadata.type === 'AGENCY';
  const subscriptionTable = isAgency ? 'agency_subscriptions' : 'academy_subscriptions';
  const organizationIdColumn = isAgency ? 'agency_id' : 'academy_id';
  const planResult = await query(
    'SELECT billing_cycle FROM subscription_plans WHERE id = $1 AND target_type = $2 AND is_active = true',
    [planId, isAgency ? 'AGENCY' : 'ACADEMY'],
  );
  if (planResult.rows.length === 0) {
    throw new Error('Checkout references an invalid subscription plan');
  }

  const stripeSubscriptionId = stripeObjectId(session.subscription);
  const stripeSubscription: any = stripeSubscriptionId
    ? await getStripe().subscriptions.retrieve(stripeSubscriptionId)
    : null;
  const subscriptionKey = stripeSubscriptionId || `checkout:${session.id}`;
  const startDate = stripeSubscription?.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000)
    : new Date();
  const endDate = stripeSubscription?.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : addBillingCycleToDate(startDate, planResult.rows[0].billing_cycle);
  const paymentReference = stripeObjectId(session.payment_intent) || session.id;
  const stripeInvoiceId = stripeObjectId(stripeSubscription?.latest_invoice) || stripeObjectId(session.invoice);

  return transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [subscriptionKey]);
    let subscription = await client.query(
      `SELECT * FROM ${subscriptionTable} WHERE stripe_subscription_id = $1 FOR UPDATE`,
      [subscriptionKey],
    );

    if (subscription.rows.length === 0) {
      const subscriptionId = uuidv4();
      await client.query(
        `UPDATE ${subscriptionTable}
         SET status = 'CANCELLED', auto_renew = false, updated_at = NOW()
         WHERE ${organizationIdColumn} = $1 AND status = 'ACTIVE'`,
        [organizationId],
      );
      subscription = await client.query(
        `INSERT INTO ${subscriptionTable} (
           id, ${organizationIdColumn}, plan_id, stripe_subscription_id, status,
           start_date, end_date, auto_renew, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          subscriptionId,
          organizationId,
          planId,
          subscriptionKey,
          startDate,
          endDate,
          Boolean(stripeSubscription && !stripeSubscription.cancel_at_period_end),
        ],
      );
    } else {
      const current = subscription.rows[0];
      await client.query(
        `UPDATE ${subscriptionTable}
         SET status = 'CANCELLED', auto_renew = false, updated_at = NOW()
         WHERE ${organizationIdColumn} = $1 AND status = 'ACTIVE' AND id <> $2`,
        [current[organizationIdColumn], current.id],
      );
      subscription = await client.query(
        `UPDATE ${subscriptionTable}
         SET status = 'ACTIVE', start_date = $1, end_date = $2,
             auto_renew = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          startDate,
          endDate,
          Boolean(stripeSubscription && !stripeSubscription.cancel_at_period_end),
          current.id,
        ],
      );
    }

    const existingPayment = await client.query(
      `SELECT id FROM subscription_payments
       WHERE subscription_id = $1 AND payment_reference = $2
       LIMIT 1`,
      [subscription.rows[0].id, paymentReference],
    );
    if (existingPayment.rows.length > 0) return existingPayment.rows[0].id;

    const paymentId = uuidv4();
    const insertedPayment = await client.query(
      `INSERT INTO subscription_payments (
         id, subscription_id, amount, currency, payment_method,
         payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'CARD', $5, $6, 'COMPLETED', $7, NOW(), NOW())
       ON CONFLICT (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        paymentId,
        subscription.rows[0].id,
        Number(session.amount_total || 0) / 100,
        String(session.currency || 'usd').toUpperCase(),
        paymentReference,
        stripeInvoiceId,
        `Stripe Checkout Session: ${session.id}`,
      ],
    );
    if (insertedPayment.rows.length === 0 && stripeInvoiceId) {
      const racedPayment = await client.query(
        'SELECT id FROM subscription_payments WHERE stripe_invoice_id = $1',
        [stripeInvoiceId],
      );
      return racedPayment.rows[0]?.id || null;
    }
    if (metadata.promoCodeId) {
      await client.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [metadata.promoCodeId]);
    }
    return insertedPayment.rows[0]?.id || paymentId;
  });
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('Processing checkout session completed:', session.id);

  try {
    if (session.metadata?.type === 'player_subscription') {
      const { playerId, planId } = session.metadata;

      if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
        console.warn(`Player checkout session ${session.id} completed without payment`);
        return;
      }

      console.log(`Processing player subscription for player ${playerId}, plan ${planId}`);

      await transaction(async (client) => {
        const plan = await client.query(
          `SELECT id FROM subscription_plans
           WHERE id = $1 AND target_type = 'INDIVIDUAL' AND is_active = true`,
          [planId],
        );
        if (plan.rows.length === 0) {
          throw new Error('Player checkout references an invalid plan');
        }
        await client.query(
          `INSERT INTO player_purchases (
            player_id, plan_type, amount, status, stripe_session_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (stripe_session_id) DO NOTHING`,
          [
            playerId,
            planId,
            session.amount_total / 100,
            'completed',
            session.id,
          ]
        );
        console.log(`Player purchase recorded for player ${playerId}`);
      });

      const paymentReference =
        typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
      const sent = await sendPlayerPurchaseReceipt(
        session.id,
        playerId,
        planId,
        session.amount_total / 100,
        (session.currency || 'usd').toUpperCase(),
        paymentReference
      );
      if (sent) {
        console.log(`Player payment confirmation email sent for session ${session.id}`);
      }
    } else if (
      session.metadata?.orgId ||
      session.metadata?.academyId ||
      session.metadata?.entityId
    ) {
      if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
        console.warn(`Checkout session ${session.id} completed without payment`);
        return;
      }
      const paymentId = await persistOrganizationCheckout(session);
      if (paymentId) await sendSubscriptionPaymentReceiptByPaymentId(paymentId);
    }
  } catch (error: any) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  // Failed attempts are retained by Stripe. They are not ledger transactions.
  console.warn(
    `Stripe payment intent ${paymentIntent.id} failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
  );
}


export default router;
