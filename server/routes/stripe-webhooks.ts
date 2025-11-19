import { Router, RequestHandler } from 'express';
import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../lib/stripe.js';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

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

async function handleSubscriptionCreated(subscription: any) {
  console.log('Processing subscription created:', subscription.id);

  try {
    await transaction(async (client) => {
      // Find academy by customer ID
      const academyResult = await client.query(
        'SELECT id FROM academies WHERE stripe_customer_id = $1',
        [subscription.customer]
      );

      if (academyResult.rows.length === 0) {
        throw new Error(`Academy not found for customer ${subscription.customer}`);
      }

      const academyId = academyResult.rows[0].id;

      // Update subscription status to active
      await client.query(`
        UPDATE academy_subscriptions 
        SET 
          status = $1,
          start_date = $2,
          end_date = $3,
          updated_at = NOW()
        WHERE stripe_subscription_id = $4
      `, [
        subscription.status.toUpperCase(),
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.id
      ]);

      console.log(`Subscription ${subscription.id} activated for academy ${academyId}`);
    });
  } catch (error: any) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Processing subscription updated:', subscription.id);

  try {
    await transaction(async (client) => {
      // Update subscription details
      const result = await client.query(`
        UPDATE academy_subscriptions 
        SET 
          status = $1,
          start_date = $2,
          end_date = $3,
          auto_renew = $4,
          updated_at = NOW()
        WHERE stripe_subscription_id = $5
        RETURNING id, academy_id
      `, [
        subscription.status.toUpperCase(),
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        !subscription.cancel_at_period_end,
        subscription.id
      ]);

      if (result.rows.length > 0) {
        console.log(`Subscription ${subscription.id} updated for academy ${result.rows[0].academy_id}`);

        // Log subscription history
        await client.query(`
          INSERT INTO subscription_history (
            id, academy_id, subscription_id, action, details, created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          uuidv4(),
          result.rows[0].academy_id,
          result.rows[0].id,
          'UPDATED',
          JSON.stringify({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: subscription.current_period_end
          })
        ]);
      }
    });
  } catch (error: any) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Processing subscription deleted:', subscription.id);

  try {
    await transaction(async (client) => {
      // Update subscription status to cancelled
      const result = await client.query(`
        UPDATE academy_subscriptions 
        SET 
          status = 'CANCELLED',
          auto_renew = false,
          updated_at = NOW()
        WHERE stripe_subscription_id = $1
        RETURNING id, academy_id
      `, [subscription.id]);

      if (result.rows.length > 0) {
        console.log(`Subscription ${subscription.id} cancelled for academy ${result.rows[0].academy_id}`);

        // Log subscription history
        await client.query(`
          INSERT INTO subscription_history (
            id, academy_id, subscription_id, action, details, created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          uuidv4(),
          result.rows[0].academy_id,
          result.rows[0].id,
          'CANCELLED',
          JSON.stringify({
            cancelled_at: subscription.canceled_at,
            reason: 'stripe_webhook'
          })
        ]);
      }
    });
  } catch (error: any) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log('Processing payment succeeded:', invoice.id);

  try {
    await transaction(async (client) => {
      // Find subscription
      const subscriptionResult = await client.query(
        'SELECT id, academy_id FROM academy_subscriptions WHERE stripe_subscription_id = $1',
        [invoice.subscription]
      );

      if (subscriptionResult.rows.length === 0) {
        console.warn(`Subscription not found for invoice ${invoice.id}`);
        return;
      }

      const { id: subscriptionId, academy_id: academyId } = subscriptionResult.rows[0];

      // Create payment record
      const paymentId = uuidv4();
      await client.query(`
        INSERT INTO subscription_payments (
          id, subscription_id, amount, currency, payment_method, 
          payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        paymentId,
        subscriptionId,
        invoice.amount_paid / 100, // Convert from cents
        invoice.currency.toUpperCase(),
        'CARD',
        invoice.payment_intent,
        invoice.id,
        'COMPLETED',
        'Payment processed via Stripe webhook'
      ]);

      console.log(`Payment recorded for subscription ${subscriptionId}, academy ${academyId}`);
    });
  } catch (error: any) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log('Processing payment failed:', invoice.id);

  try {
    await transaction(async (client) => {
      // Find subscription
      const subscriptionResult = await client.query(
        'SELECT id, academy_id FROM academy_subscriptions WHERE stripe_subscription_id = $1',
        [invoice.subscription]
      );

      if (subscriptionResult.rows.length === 0) {
        console.warn(`Subscription not found for failed invoice ${invoice.id}`);
        return;
      }

      const { id: subscriptionId, academy_id: academyId } = subscriptionResult.rows[0];

      // Create failed payment record
      const paymentId = uuidv4();
      await client.query(`
        INSERT INTO subscription_payments (
          id, subscription_id, amount, currency, payment_method, 
          payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        paymentId,
        subscriptionId,
        invoice.amount_due / 100, // Convert from cents
        invoice.currency.toUpperCase(),
        'CARD',
        invoice.payment_intent,
        invoice.id,
        'FAILED',
        `Payment failed: ${invoice.last_finalization_error?.message || 'Unknown error'}`
      ]);

      // Update subscription status if needed
      await client.query(`
        UPDATE academy_subscriptions 
        SET status = 'PAST_DUE', updated_at = NOW()
        WHERE id = $1 AND status = 'ACTIVE'
      `, [subscriptionId]);

      console.log(`Failed payment recorded for subscription ${subscriptionId}, academy ${academyId}`);
    });
  } catch (error: any) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

async function handleCustomerCreated(customer: any) {
  console.log('Processing customer created:', customer.id);

  try {
    // Update academy with customer ID if not already set
    const result = await query(`
      UPDATE academies 
      SET stripe_customer_id = $1, updated_at = NOW()
      WHERE email = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id = '')
      RETURNING id, name
    `, [customer.id, customer.email]);

    if (result.rows.length > 0) {
      console.log(`Customer ${customer.id} linked to academy ${result.rows[0].id}`);
    }
  } catch (error: any) {
    console.error('Error handling customer created:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Processing payment intent succeeded:', paymentIntent.id);

  try {
    // This handles one-time payments that aren't part of subscriptions
    if (paymentIntent.metadata?.academyId) {
      await transaction(async (client) => {
        // Create a financial transaction record
        const transactionId = uuidv4();
        await client.query(`
          INSERT INTO financial_transactions (
            id, academy_id, transaction_type, amount, currency, 
            payment_method, stripe_payment_intent_id, status, 
            description, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [
          transactionId,
          paymentIntent.metadata.academyId,
          'PAYMENT',
          paymentIntent.amount / 100, // Convert from cents
          paymentIntent.currency.toUpperCase(),
          'CARD',
          paymentIntent.id,
          'COMPLETED',
          paymentIntent.metadata.description || 'One-time payment',
        ]);

        console.log(`One-time payment recorded for academy ${paymentIntent.metadata.academyId}`);
      });
    }
  } catch (error: any) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('Processing payment intent failed:', paymentIntent.id);

  try {
    // Log failed payment attempt
    if (paymentIntent.metadata?.academyId) {
      await transaction(async (client) => {
        const transactionId = uuidv4();
        await client.query(`
          INSERT INTO financial_transactions (
            id, academy_id, transaction_type, amount, currency, 
            payment_method, stripe_payment_intent_id, status, 
            description, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [
          transactionId,
          paymentIntent.metadata.academyId,
          'PAYMENT',
          paymentIntent.amount / 100,
          paymentIntent.currency.toUpperCase(),
          'CARD',
          paymentIntent.id,
          'FAILED',
          `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
        ]);

        console.log(`Failed payment logged for academy ${paymentIntent.metadata.academyId}`);
      });
    }
  } catch (error: any) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

export default router;