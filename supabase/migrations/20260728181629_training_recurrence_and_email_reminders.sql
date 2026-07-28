-- Calendar-aware training recurrence and idempotent email reminder delivery.
-- The server remains the only data-access path for these academy-scoped records.

ALTER TABLE training_session_series
  ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_interval SMALLINT,
  ADD COLUMN IF NOT EXISTS recurrence_weekday SMALLINT,
  ADD COLUMN IF NOT EXISTS timezone_offset_minutes SMALLINT NOT NULL DEFAULT 0;

UPDATE training_session_series
SET
  recurrence_frequency = COALESCE(recurrence_frequency, 'weekly'),
  recurrence_interval = COALESCE(recurrence_interval, interval_weeks, 1)
WHERE recurrence_frequency IS NULL
   OR recurrence_interval IS NULL;

ALTER TABLE training_session_series
  ALTER COLUMN interval_weeks DROP NOT NULL,
  ALTER COLUMN recurrence_frequency SET NOT NULL,
  ALTER COLUMN recurrence_interval SET NOT NULL;

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS timezone_offset_minutes SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_hours_before SMALLINT NOT NULL DEFAULT 24;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_session_series_frequency_check'
      AND conrelid = 'training_session_series'::regclass
  ) THEN
    ALTER TABLE training_session_series
      ADD CONSTRAINT training_session_series_frequency_check
      CHECK (recurrence_frequency IN ('daily', 'weekly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_session_series_recurrence_interval_check'
      AND conrelid = 'training_session_series'::regclass
  ) THEN
    ALTER TABLE training_session_series
      ADD CONSTRAINT training_session_series_recurrence_interval_check
      CHECK (recurrence_interval BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_session_series_weekday_check'
      AND conrelid = 'training_session_series'::regclass
  ) THEN
    ALTER TABLE training_session_series
      ADD CONSTRAINT training_session_series_weekday_check
      CHECK (
        recurrence_weekday IS NULL
        OR (
          recurrence_frequency = 'weekly'
          AND recurrence_weekday BETWEEN 0 AND 6
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_session_series_timezone_offset_check'
      AND conrelid = 'training_session_series'::regclass
  ) THEN
    ALTER TABLE training_session_series
      ADD CONSTRAINT training_session_series_timezone_offset_check
      CHECK (timezone_offset_minutes BETWEEN -840 AND 840);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_timezone_offset_check'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_timezone_offset_check
      CHECK (timezone_offset_minutes BETWEEN -840 AND 840);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_reminder_hours_check'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_reminder_hours_check
      CHECK (reminder_hours_before BETWEEN 1 AND 168);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS training_session_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL
    REFERENCES training_sessions(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL
    REFERENCES academies(id) ON DELETE CASCADE,
  recipient_type VARCHAR(30) NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_email_normalized TEXT
    GENERATED ALWAYS AS (LOWER(BTRIM(recipient_email))) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  attempt_count SMALLINT NOT NULL DEFAULT 1,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_session_reminder_recipient_type_check
    CHECK (recipient_type IN ('academy_admin', 'player')),
  CONSTRAINT training_session_reminder_email_check
    CHECK (CHAR_LENGTH(BTRIM(recipient_email)) BETWEEN 3 AND 320),
  CONSTRAINT training_session_reminder_status_check
    CHECK (status IN ('processing', 'sent', 'failed')),
  CONSTRAINT training_session_reminder_attempt_count_check
    CHECK (attempt_count BETWEEN 1 AND 3),
  CONSTRAINT training_session_reminder_delivery_key
    UNIQUE (session_id, recipient_email_normalized)
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_reminders_due
  ON training_sessions(session_date)
  WHERE status = 'scheduled'
    AND is_active = TRUE
    AND reminders_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_training_session_reminders_academy
  ON training_session_reminder_deliveries(academy_id, created_at DESC);

ALTER TABLE training_session_reminder_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE training_session_reminder_deliveries
  FROM anon, authenticated;
