import { Router, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../lib/db.js';
import { getStripe } from '../lib/stripe.js';
import {
  sendAcademyCheckoutReceipt,
  sendSubscriptionPaymentReceiptByPaymentId,
} from '../lib/payment-receipt.js';

const router = Router();

function safeISOString(date?: Date | number | string | null): string {
  try {
    if (date === null || date === undefined) {
      return new Date().toISOString();
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export const handleVerifyPayment: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: session.payment_status,
      });
    }

    const { academyId, planId } = session.metadata || {};

    if (!academyId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session metadata',
      });
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message:
          'No subscription ID found in session. Please ensure the payment was configured as a subscription.',
        error: 'MISSING_SUBSCRIPTION_ID',
      });
    }

    const existingSub = await query(
      'SELECT id FROM academy_subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );

    if (existingSub.rows.length > 0) {
      const existingPayment = await query(
        `SELECT id FROM subscription_payments
         WHERE subscription_id = $1
           AND payment_reference = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [existingSub.rows[0].id, session.payment_intent || session.id]
      );

      if (existingPayment.rows.length > 0) {
        await sendSubscriptionPaymentReceiptByPaymentId(existingPayment.rows[0].id);
      }

      return res.json({
        success: true,
        message: 'Subscription already processed',
        subscriptionId: existingSub.rows[0].id,
      });
    }

    await query(
      `UPDATE academy_subscriptions
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE academy_id = $1 AND status = 'ACTIVE'`,
      [academyId]
    );

    const stripeSub: any = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const nowSeconds = Math.floor(Date.now() / 1000);

    let periodStart = stripeSub.current_period_start ?? stripeSub.start_date ?? nowSeconds;
    let periodEnd = stripeSub.current_period_end ?? periodStart + 30 * 24 * 60 * 60;

    const subscriptionId = uuidv4();
    const startDateStr = safeISOString(Number(periodStart) * 1000);
    const endDateStr = safeISOString(Number(periodEnd) * 1000);

    await query(
      `INSERT INTO academy_subscriptions (
         id, academy_id, plan_id, stripe_subscription_id, status,
         start_date, end_date, auto_renew, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, NOW(), NOW())`,
      [
        subscriptionId,
        academyId,
        planId,
        stripeSubscriptionId,
        startDateStr,
        endDateStr,
        !stripeSub.cancel_at_period_end,
      ]
    );

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const currency = (session.currency || 'usd').toUpperCase();
    const paymentReference =
      typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
    const stripeInvoiceId =
      typeof stripeSub.latest_invoice === 'string'
        ? stripeSub.latest_invoice
        : stripeSub.latest_invoice?.id;

    const paymentId = uuidv4();
    await query(
      `INSERT INTO subscription_payments (
         id, subscription_id, amount, currency, payment_method,
         payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'CARD', $5, $6, 'COMPLETED', $7, NOW(), NOW())`,
      [
        paymentId,
        subscriptionId,
        amount,
        currency,
        paymentReference,
        stripeInvoiceId,
        `Stripe Checkout Session: ${session.id}`,
      ]
    );

    const academyResult = await query(
      `SELECT a.name, a.email, COALESCE(p.name, $2) AS plan_name
       FROM academies a
       LEFT JOIN subscription_plans p ON p.id = $1
       WHERE a.id = $3`,
      [planId, session.metadata?.planName || planId, academyId]
    );

    if (academyResult.rows.length > 0 && academyResult.rows[0].email) {
      const academy = academyResult.rows[0];
      const sent = await sendAcademyCheckoutReceipt(
        paymentId,
        academy.email,
        academy.name,
        academy.plan_name,
        amount,
        currency,
        paymentReference,
        stripeInvoiceId
      );
      if (sent) {
        console.log(`[Payments] Receipt email sent to ${academy.email}`);
      } else {
        console.warn(`[Payments] Receipt email not sent for payment ${paymentId}`);
      }
    }

    return res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscriptionId,
    });
  } catch (error: any) {
    console.error('[Payments] Verify payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message,
    });
  }
};

router.post('/verify-payment', handleVerifyPayment);

export default router;
