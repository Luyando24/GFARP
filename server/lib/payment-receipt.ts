import { query } from './db.js';
import { emailService } from './email-service.js';

export interface PaymentReceiptParams {
  toEmail: string;
  recipientName: string;
  amount: number;
  currency: string;
  planName: string;
  paymentReference: string;
  stripeInvoiceId?: string;
  paymentDate?: Date;
}

export async function sendPaymentReceipt(params: PaymentReceiptParams): Promise<boolean> {
  await emailService.initializeFromDatabase();
  return emailService.sendPaymentConfirmationEmail(
    params.toEmail,
    params.recipientName,
    params.amount,
    params.currency,
    params.planName,
    params.paymentReference,
    params.paymentDate ?? new Date(),
    params.stripeInvoiceId
  );
}

async function ensureReceiptColumns(): Promise<void> {
  await query(`
    ALTER TABLE subscription_payments
    ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ
  `);
  await query(`
    ALTER TABLE player_purchases
    ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ
  `);
}

/** Send receipt for a subscription_payments row (idempotent). */
export async function sendSubscriptionPaymentReceiptByPaymentId(
  paymentId: string
): Promise<boolean> {
  await ensureReceiptColumns();

  const claim = await query(
    `UPDATE subscription_payments
     SET receipt_email_sent_at = NOW(), updated_at = NOW()
     WHERE id = $1
       AND status = 'COMPLETED'
       AND receipt_email_sent_at IS NULL
     RETURNING id, amount, currency, payment_reference, stripe_invoice_id, subscription_id, created_at`,
    [paymentId]
  );

  if (claim.rows.length === 0) {
    return false;
  }

  const payment = claim.rows[0];

  let orgResult = await query(
    `SELECT a.name AS org_name, a.email AS org_email, p.name AS plan_name
     FROM academy_subscriptions s
     JOIN academies a ON s.academy_id = a.id
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.id = $1`,
    [payment.subscription_id]
  );

  if (orgResult.rows.length === 0) {
    orgResult = await query(
      `SELECT a.name AS org_name, a.email AS org_email, p.name AS plan_name
       FROM agency_subscriptions s
       JOIN agencies a ON s.agency_id = a.id
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.id = $1`,
      [payment.subscription_id]
    );
  }

  if (orgResult.rows.length === 0 || !orgResult.rows[0].org_email) {
    console.warn('[PaymentReceipt] No org email for subscription payment', paymentId);
    return false;
  }

  const org = orgResult.rows[0];
  return sendPaymentReceipt({
    toEmail: org.org_email,
    recipientName: org.org_name,
    amount: Number(payment.amount),
    currency: payment.currency || 'USD',
    planName: org.plan_name,
    paymentReference: payment.payment_reference || payment.id,
    stripeInvoiceId: payment.stripe_invoice_id || undefined,
    paymentDate: new Date(payment.created_at),
  });
}

/** Send receipt after academy Stripe checkout (idempotent by payment id). */
export async function sendAcademyCheckoutReceipt(
  paymentId: string,
  academyEmail: string,
  academyName: string,
  planName: string,
  amount: number,
  currency: string,
  paymentReference: string,
  stripeInvoiceId?: string
): Promise<boolean> {
  await ensureReceiptColumns();

  const claim = await query(
    `UPDATE subscription_payments
     SET receipt_email_sent_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND receipt_email_sent_at IS NULL
     RETURNING id`,
    [paymentId]
  );

  if (claim.rows.length === 0) {
    return false;
  }

  if (!academyEmail) {
    return false;
  }

  return sendPaymentReceipt({
    toEmail: academyEmail,
    recipientName: academyName,
    amount,
    currency,
    planName,
    paymentReference,
    stripeInvoiceId,
  });
}

/** Try to send receipt for an academy payment matched to a Stripe checkout session. */
export async function sendAcademyReceiptForCheckoutSession(
  sessionId: string,
  paymentIntent?: string | null
): Promise<boolean> {
  const refs = [paymentIntent, sessionId].filter(Boolean) as string[];
  if (refs.length === 0) {
    return false;
  }

  const result = await query(
    `SELECT id FROM subscription_payments
     WHERE (
       payment_reference = $1
       OR payment_reference = $2
       OR notes LIKE '%' || $3 || '%'
     )
     AND status = 'COMPLETED'
     ORDER BY created_at DESC
     LIMIT 1`,
    [refs[0] || sessionId, refs[1] || sessionId, sessionId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return sendSubscriptionPaymentReceiptByPaymentId(result.rows[0].id);
}

/** Send receipt for individual player purchase (idempotent by stripe session id). */
export async function sendPlayerPurchaseReceipt(
  stripeSessionId: string,
  playerId: string,
  planId: string,
  amount: number,
  currency: string,
  paymentReference: string
): Promise<boolean> {
  await ensureReceiptColumns();

  const claim = await query(
    `UPDATE player_purchases
     SET receipt_email_sent_at = NOW()
     WHERE stripe_session_id = $1
       AND status = 'completed'
       AND receipt_email_sent_at IS NULL
     RETURNING player_id`,
    [stripeSessionId]
  );

  if (claim.rows.length === 0) {
    return false;
  }

  const playerResult = await query(
    `SELECT first_name, last_name, email FROM individual_players WHERE id = $1`,
    [playerId]
  );

  if (playerResult.rows.length === 0 || !playerResult.rows[0].email) {
    return false;
  }

  const player = playerResult.rows[0];
  const planResult = await query(
    'SELECT name FROM subscription_plans WHERE id = $1',
    [planId]
  );
  const planName = planResult.rows[0]?.name
    || `${planId.charAt(0).toUpperCase()}${planId.slice(1)} Plan`;

  return sendPaymentReceipt({
    toEmail: player.email,
    recipientName: `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Player',
    amount,
    currency,
    planName,
    paymentReference,
  });
}
