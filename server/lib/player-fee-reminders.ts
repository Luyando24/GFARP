import { query } from './db.js';
import { emailService } from './email-service.js';

interface ReminderRunResult {
  subscriptionsChecked: number;
  emailsSent: number;
  emailsFailed: number;
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatMoney = (amount: number | string, currency: string) => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

async function recordDelivery(
  subscriptionId: string,
  renewalDate: string,
  recipientType: 'academy' | 'player',
  recipientEmail: string,
  status: 'sent' | 'failed',
  error?: string,
) {
  await query(`
    INSERT INTO player_fee_reminder_deliveries (
      subscription_id, renewal_date, recipient_type, recipient_email,
      status, error_message, sent_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5::VARCHAR(20), $6,
      CASE WHEN $5::VARCHAR(20) = 'sent' THEN NOW() ELSE NULL END,
      NOW()
    )
    ON CONFLICT (subscription_id, renewal_date, recipient_type)
    DO UPDATE SET
      recipient_email = EXCLUDED.recipient_email,
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      sent_at = EXCLUDED.sent_at,
      updated_at = NOW()
  `, [subscriptionId, renewalDate, recipientType, recipientEmail, status, error || null]);
}

async function claimDelivery(
  subscriptionId: string,
  renewalDate: string,
  recipientType: 'academy' | 'player',
  recipientEmail: string,
) {
  const result = await query(`
    INSERT INTO player_fee_reminder_deliveries (
      subscription_id, renewal_date, recipient_type, recipient_email,
      status, updated_at
    ) VALUES ($1, $2, $3, $4, 'processing', NOW())
    ON CONFLICT (subscription_id, renewal_date, recipient_type)
    DO UPDATE SET
      recipient_email = EXCLUDED.recipient_email,
      status = 'processing',
      error_message = NULL,
      updated_at = NOW()
    WHERE player_fee_reminder_deliveries.status = 'failed'
       OR (
         player_fee_reminder_deliveries.status = 'processing'
         AND player_fee_reminder_deliveries.updated_at < NOW() - INTERVAL '15 minutes'
       )
    RETURNING id
  `, [subscriptionId, renewalDate, recipientType, recipientEmail]);
  return result.rows.length > 0;
}

export async function processPlayerFeeRenewalReminders(academyId?: string): Promise<ReminderRunResult> {
  const params: Array<string> = [];
  const academyFilter = academyId ? 'AND pfs.academy_id = $1' : '';
  if (academyId) params.push(academyId);

  const dueResult = await query(`
    SELECT
      pfs.*,
      a.name AS academy_name,
      a.email AS academy_email,
      EXISTS (
        SELECT 1 FROM player_fee_reminder_deliveries d
        WHERE d.subscription_id = pfs.id
          AND d.renewal_date = pfs.next_renewal_date
          AND d.recipient_type = 'academy'
          AND d.status = 'sent'
      ) AS academy_reminder_sent,
      EXISTS (
        SELECT 1 FROM player_fee_reminder_deliveries d
        WHERE d.subscription_id = pfs.id
          AND d.renewal_date = pfs.next_renewal_date
          AND d.recipient_type = 'player'
          AND d.status = 'sent'
      ) AS player_reminder_sent
    FROM player_fee_subscriptions pfs
    JOIN academies a ON a.id = pfs.academy_id
    LEFT JOIN academy_financial_settings afs ON afs.academy_id = pfs.academy_id
    WHERE pfs.status = 'active'
      AND COALESCE(afs.renewal_reminders_enabled, TRUE) = TRUE
      AND pfs.next_renewal_date <= CURRENT_DATE + pfs.reminder_days_before
      ${academyFilter}
    ORDER BY pfs.next_renewal_date ASC
  `, params);

  let emailsSent = 0;
  let emailsFailed = 0;

  for (const subscription of dueResult.rows as any[]) {
    const renewalDate = new Date(subscription.next_renewal_date).toISOString().split('T')[0];
    const formattedAmount = formatMoney(subscription.amount, subscription.currency);
    const cycle = subscription.billing_cycle === 'custom'
      ? subscription.custom_billing_label
      : subscription.billing_cycle;
    const subject = `Player fee renewal reminder: ${subscription.player_name}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033">
        <h2 style="color:#166534">Player fee renewal reminder</h2>
        <p>The <strong>${escapeHtml(subscription.fee_name)}</strong> fee for
          <strong>${escapeHtml(subscription.player_name)}</strong> renews on
          <strong>${escapeHtml(renewalDate)}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:20px 0">
          <tr><td style="padding:8px;border:1px solid #ddd">Amount</td><td style="padding:8px;border:1px solid #ddd"><strong>${escapeHtml(formattedAmount)}</strong></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd">Payment type</td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(cycle)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd">Academy</td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(subscription.academy_name)}</td></tr>
        </table>
        <p>This is a reminder only. Player fees are paid directly to the academy outside Soccer Circular.</p>
      </div>`;

    const recipients: Array<{ type: 'academy' | 'player'; email: string; sent: boolean }> = [
      { type: 'academy', email: subscription.academy_email || '', sent: subscription.academy_reminder_sent },
      { type: 'player', email: subscription.player_email || '', sent: subscription.player_reminder_sent },
    ];

    for (const recipient of recipients) {
      if (recipient.sent) continue;
      const claimed = await claimDelivery(subscription.id, renewalDate, recipient.type, recipient.email);
      if (!claimed) continue;
      if (!recipient.email) {
        await recordDelivery(subscription.id, renewalDate, recipient.type, '', 'failed', 'Recipient email is missing');
        emailsFailed += 1;
        continue;
      }

      const result = await emailService.sendEmail({
        to: recipient.email,
        subject,
        html,
      });
      await recordDelivery(
        subscription.id,
        renewalDate,
        recipient.type,
        recipient.email,
        result.success ? 'sent' : 'failed',
        result.error,
      );
      result.success ? emailsSent += 1 : emailsFailed += 1;
    }

    const deliveryStatus = await query(`
      SELECT COUNT(*)::int AS sent_count
      FROM player_fee_reminder_deliveries
      WHERE subscription_id = $1 AND renewal_date = $2 AND status = 'sent'
    `, [subscription.id, renewalDate]);
    if (Number(deliveryStatus.rows[0]?.sent_count) === 2) {
      await query(`
        UPDATE player_fee_subscriptions
        SET last_reminder_sent_for = $2, last_reminder_sent_at = NOW()
        WHERE id = $1
      `, [subscription.id, renewalDate]);
    }
  }

  return {
    subscriptionsChecked: dueResult.rows.length,
    emailsSent,
    emailsFailed,
  };
}

let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startPlayerFeeReminderScheduler() {
  if (reminderTimer || process.env.NODE_ENV === 'test') return;

  const run = () => processPlayerFeeRenewalReminders().catch((error) => {
    console.error('[PlayerFeeReminders] Scheduled run failed:', error);
  });

  const initialTimer = setTimeout(run, 15_000);
  initialTimer.unref?.();
  reminderTimer = setInterval(run, 6 * 60 * 60 * 1000);
  reminderTimer.unref?.();
}
