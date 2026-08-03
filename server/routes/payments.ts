import { Router, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../lib/db.js';
import { getStripe } from '../lib/stripe.js';
import { sendSubscriptionPaymentReceiptByPaymentId } from '../lib/payment-receipt.js';
import { authenticateToken, canAccessOrganizationForRequest } from '../middleware/auth.js';
import { addBillingCycleToDate } from '../../shared/calendar-date.js';

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

    const metadata = session.metadata || {};
    const organizationId = metadata.orgId || metadata.academyId || metadata.entityId;
    const planId = metadata.planId;

    if (!organizationId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session metadata',
      });
    }

    if (!(await canAccessOrganizationForRequest(req.user, organizationId))) {
      return res.status(403).json({ success: false, message: 'Payment does not belong to this account' });
    }

    const isAgency = metadata.type === 'AGENCY' || req.user?.role === 'agency_admin';
    const subscriptionTable = isAgency ? 'agency_subscriptions' : 'academy_subscriptions';
    const organizationIdColumn = isAgency ? 'agency_id' : 'academy_id';
    const planResult = await query(
      'SELECT billing_cycle FROM subscription_plans WHERE id = $1 AND target_type = $2 AND is_active = true',
      [planId, isAgency ? 'AGENCY' : 'ACADEMY'],
    );
    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive subscription plan' });
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    const stripeSub: any = stripeSubscriptionId
      ? await stripe.subscriptions.retrieve(stripeSubscriptionId)
      : null;
    const nowSeconds = Math.floor(Date.now() / 1000);

    const periodStart = stripeSub?.current_period_start ?? stripeSub?.start_date ?? nowSeconds;
    const fallbackEnd = addBillingCycleToDate(
      new Date(Number(periodStart) * 1000),
      planResult.rows[0].billing_cycle,
    );
    const periodEnd = stripeSub?.current_period_end ?? Math.floor(fallbackEnd.getTime() / 1000);
    const subscriptionKey = stripeSubscriptionId || `checkout:${session.id}`;

    const subscriptionId = uuidv4();
    const startDateStr = safeISOString(Number(periodStart) * 1000);
    const endDateStr = safeISOString(Number(periodEnd) * 1000);

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const currency = (session.currency || 'usd').toUpperCase();
    const paymentReference =
      typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
    const stripeInvoiceId =
      typeof stripeSub?.latest_invoice === 'string'
        ? stripeSub.latest_invoice
        : stripeSub?.latest_invoice?.id;

    const paymentId = uuidv4();
    const persisted = await transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [subscriptionKey]);
      const existingSub = await client.query(
        `SELECT id FROM ${subscriptionTable} WHERE stripe_subscription_id = $1`,
        [subscriptionKey],
      );
      if (existingSub.rows.length) {
        const existingPayment = await client.query(
          `SELECT id FROM subscription_payments WHERE subscription_id = $1 AND payment_reference = $2 LIMIT 1`,
          [existingSub.rows[0].id, paymentReference],
        );
        return { subscriptionId: existingSub.rows[0].id, paymentId: existingPayment.rows[0]?.id, existing: true };
      }

      await client.query(
        `UPDATE ${subscriptionTable}
         SET status = 'CANCELLED', auto_renew = false, updated_at = NOW()
         WHERE ${organizationIdColumn} = $1 AND status = 'ACTIVE'`,
        [organizationId],
      );
      await client.query(
        `INSERT INTO ${subscriptionTable} (
           id, ${organizationIdColumn}, plan_id, stripe_subscription_id, status,
           start_date, end_date, auto_renew, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, NOW(), NOW())`,
        [
          subscriptionId,
          organizationId,
          planId,
          subscriptionKey,
          startDateStr,
          endDateStr,
          Boolean(stripeSub && !stripeSub.cancel_at_period_end),
        ],
      );
      await client.query(
        `INSERT INTO subscription_payments (
           id, subscription_id, amount, currency, payment_method,
           payment_reference, stripe_invoice_id, status, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'CARD', $5, $6, 'COMPLETED', $7, NOW(), NOW())`,
        [paymentId, subscriptionId, amount, currency, paymentReference, stripeInvoiceId, `Stripe Checkout Session: ${session.id}`],
      );
      if (metadata.promoCodeId) {
        await client.query(
          `UPDATE promo_codes
           SET used_count = used_count + 1
           WHERE id = $1`,
          [metadata.promoCodeId],
        );
      }
      return { subscriptionId, paymentId, existing: false };
    });

    if (persisted.existing) {
      if (persisted.paymentId) await sendSubscriptionPaymentReceiptByPaymentId(persisted.paymentId);
      return res.json({ success: true, message: 'Subscription already processed', subscriptionId: persisted.subscriptionId });
    }

    const receiptSent = await sendSubscriptionPaymentReceiptByPaymentId(paymentId);
    if (!receiptSent) {
      console.warn(`[Payments] Receipt email not sent for payment ${paymentId}`);
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

router.post('/verify-payment', authenticateToken, handleVerifyPayment);

export default router;
