import { query } from './db.js';
import { emailService } from './email-service.js';

type ReminderRecipientType = 'academy_admin' | 'player';

interface ReminderRecipient {
  type: ReminderRecipientType;
  email: string;
}

interface DueTrainingSession {
  id: string;
  academy_id: string;
  academy_name: string;
  academy_email?: string | null;
  director_email?: string | null;
  title: string;
  description?: string | null;
  session_date: string | Date;
  duration_minutes: number;
  location: string;
  timezone_offset_minutes: number;
}

export interface TrainingReminderRunResult {
  sessionsChecked: number;
  recipientsFound: number;
  emailsSent: number;
  emailsFailed: number;
  emailsSkipped: number;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function decryptPlayerValue(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('\\x')) {
    return Buffer.from(value.slice(2), 'hex').toString('utf8');
  }
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return Buffer.from(value as ArrayBuffer).toString('utf8');
  }
  return String(value);
}

function normalizeEmail(value: unknown) {
  const email = decryptPlayerValue(value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function formatTrainingReminderDate(
  value: string | Date,
  timezoneOffsetMinutes = 0,
) {
  const sessionDate = new Date(value);
  const localWallClock = new Date(
    sessionDate.getTime() - timezoneOffsetMinutes * 60_000,
  );
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
    .format(localWallClock)
    .replace('UTC', 'local time');
}

async function loadSessionRecipients(
  session: DueTrainingSession,
): Promise<ReminderRecipient[]> {
  const [staffResult, playersResult] = await Promise.all([
    query(
      `SELECT email::text
         FROM staff_users
        WHERE academy_id = $1
          AND is_active = TRUE
          AND role::text = 'academy_admin'
        ORDER BY id`,
      [session.academy_id],
    ),
    query(
      `SELECT email_value
         FROM (
           SELECT email_cipher AS email_value
             FROM players
            WHERE academy_id = $1
           UNION ALL
           SELECT email::bytea AS email_value
             FROM individual_players
            WHERE academy_id = $1
         ) academy_players`,
      [session.academy_id],
    ),
  ]);

  const recipients: ReminderRecipient[] = [
    {
      type: 'academy_admin',
      email: normalizeEmail(session.academy_email),
    },
    {
      type: 'academy_admin',
      email: normalizeEmail(session.director_email),
    },
    ...staffResult.rows.map((row) => ({
      type: 'academy_admin' as const,
      email: normalizeEmail(row.email),
    })),
    ...playersResult.rows.map((row) => ({
      type: 'player' as const,
      email: normalizeEmail(row.email_value),
    })),
  ];

  const deduplicated = new Map<string, ReminderRecipient>();
  for (const recipient of recipients) {
    if (!recipient.email || deduplicated.has(recipient.email)) continue;
    deduplicated.set(recipient.email, recipient);
  }
  return [...deduplicated.values()];
}

async function claimDelivery(
  session: DueTrainingSession,
  recipient: ReminderRecipient,
) {
  const result = await query(
    `INSERT INTO training_session_reminder_deliveries (
       session_id,
       academy_id,
       recipient_type,
       recipient_email,
       status,
       attempt_count,
       updated_at
     )
     VALUES ($1, $2, $3, $4, 'processing', 1, NOW())
     ON CONFLICT (session_id, recipient_email_normalized)
     DO UPDATE SET
       recipient_type = EXCLUDED.recipient_type,
       recipient_email = EXCLUDED.recipient_email,
       status = 'processing',
       attempt_count =
         training_session_reminder_deliveries.attempt_count + 1,
       error_message = NULL,
       updated_at = NOW()
     WHERE (
       training_session_reminder_deliveries.status = 'failed'
       OR (
         training_session_reminder_deliveries.status = 'processing'
         AND training_session_reminder_deliveries.updated_at <
           NOW() - INTERVAL '15 minutes'
       )
     )
       AND training_session_reminder_deliveries.attempt_count < 3
     RETURNING id`,
    [
      session.id,
      session.academy_id,
      recipient.type,
      recipient.email,
    ],
  );

  return result.rows[0]?.id as string | undefined;
}

async function recordDelivery(
  deliveryId: string,
  status: 'sent' | 'failed',
  error?: string,
) {
  await query(
    `UPDATE training_session_reminder_deliveries
        SET status = $2::VARCHAR(20),
            error_message = $3::TEXT,
            sent_at = CASE
              WHEN $2::VARCHAR(20) = 'sent' THEN NOW()
              ELSE NULL
            END,
            updated_at = NOW()
      WHERE id = $1`,
    [deliveryId, status, error || null],
  );
}

function buildReminderEmail(session: DueTrainingSession) {
  const formattedDate = formatTrainingReminderDate(
    session.session_date,
    Number(session.timezone_offset_minutes || 0),
  );
  const duration = Number(session.duration_minutes || 90);
  return {
    subject: `Training reminder: ${session.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033">
        <div style="background:#eff6ff;border-radius:16px;padding:24px">
          <p style="margin:0 0 8px;color:#2563eb;font-weight:700">Upcoming training</p>
          <h2 style="margin:0;color:#0f172a">${escapeHtml(session.title)}</h2>
        </div>
        <table style="border-collapse:collapse;width:100%;margin:22px 0">
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Academy</td><td style="padding:10px;border-bottom:1px solid #e2e8f0"><strong>${escapeHtml(session.academy_name)}</strong></td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Date and time</td><td style="padding:10px;border-bottom:1px solid #e2e8f0"><strong>${escapeHtml(formattedDate)}</strong></td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Location</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(session.location)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Duration</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${duration} minutes</td></tr>
        </table>
        ${
          session.description
            ? `<p><strong>Session focus:</strong> ${escapeHtml(session.description)}</p>`
            : ''
        }
        <p>Please arrive early and come prepared for training.</p>
      </div>`,
  };
}

async function sendWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

export async function processTrainingSessionReminders(
  academyId?: string,
): Promise<TrainingReminderRunResult> {
  await emailService.initializeFromDatabase();

  const params: string[] = [];
  const academyFilter = academyId ? 'AND s.academy_id = $1' : '';
  if (academyId) params.push(academyId);

  const dueResult = await query(
    `SELECT
       s.id,
       s.academy_id,
       s.title,
       s.description,
       s.session_date,
       s.duration_minutes,
       s.location,
       s.timezone_offset_minutes,
       a.name AS academy_name,
       a.email AS academy_email,
       a.director_email
     FROM training_sessions s
     JOIN academies a ON a.id = s.academy_id
     WHERE s.status = 'scheduled'
       AND s.is_active = TRUE
       AND s.reminders_enabled = TRUE
       AND s.session_date > NOW()
       -- The production cron runs daily. The extra 24-hour window prevents a
       -- session from being skipped because it falls between two cron runs.
       AND s.session_date <= NOW() +
         ((s.reminder_hours_before + 24) * INTERVAL '1 hour')
       ${academyFilter}
     ORDER BY s.session_date, s.id
     LIMIT 25`,
    params,
  );

  const jobs: Array<{
    session: DueTrainingSession;
    recipient: ReminderRecipient;
  }> = [];
  for (const session of dueResult.rows as DueTrainingSession[]) {
    const recipients = await loadSessionRecipients(session);
    jobs.push(
      ...recipients.map((recipient) => ({
        session,
        recipient,
      })),
    );
  }

  let emailsSent = 0;
  let emailsFailed = 0;
  let emailsSkipped = 0;

  await sendWithConcurrency(jobs, 5, async ({ session, recipient }) => {
    const deliveryId = await claimDelivery(session, recipient);
    if (!deliveryId) {
      emailsSkipped += 1;
      return;
    }

    const email = buildReminderEmail(session);
    const result = await emailService.sendEmail({
      to: recipient.email,
      subject: email.subject,
      html: email.html,
    });
    await recordDelivery(
      deliveryId,
      result.success ? 'sent' : 'failed',
      result.error,
    );
    if (result.success) emailsSent += 1;
    else emailsFailed += 1;
  });

  return {
    sessionsChecked: dueResult.rows.length,
    recipientsFound: jobs.length,
    emailsSent,
    emailsFailed,
    emailsSkipped,
  };
}

let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startTrainingSessionReminderScheduler() {
  if (reminderTimer || process.env.NODE_ENV === 'test') return;

  const run = () =>
    processTrainingSessionReminders().catch((error) => {
      console.error('[TrainingSessionReminders] Scheduled run failed:', error);
    });

  const initialTimer = setTimeout(run, 30_000);
  initialTimer.unref?.();
  reminderTimer = setInterval(run, 6 * 60 * 60 * 1000);
  reminderTimer.unref?.();
}
