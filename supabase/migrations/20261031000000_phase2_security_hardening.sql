-- Phase 2 hardening: token revocation, one-time tokens, notification audience,
-- optional NRC, and case-insensitive academy email uniqueness.

-- ---------------------------------------------------------------------------
-- Session token versioning (lets us revoke every issued JWT for an account)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['academies', 'agencies', 'individual_players', 'staff_users', 'Admin']
  LOOP
    IF to_regclass(format('public.%I', target)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0',
        target
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- One-time tokens (store only the SHA-256 hash; raw value goes in the email)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user
  ON email_verification_tokens(user_type, user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(account_type, user_id);

-- Verification state for academies (existing rows are grandfathered).
ALTER TABLE IF EXISTS public.academies
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.academies SET email_verified = TRUE WHERE email_verified = FALSE;

-- ---------------------------------------------------------------------------
-- Notifications can target any account type, not only staff_users
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_notifications
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'staff';

ALTER TABLE IF EXISTS public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_user_id_fkey;
ALTER TABLE IF EXISTS public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_notification_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_recipient
  ON public.user_notifications(notification_id, user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_lookup
  ON public.user_notifications(user_type, user_id);

-- ---------------------------------------------------------------------------
-- NRC is optional: keep NULL when the academy did not capture one
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.players ALTER COLUMN nrc_hash DROP NOT NULL;
ALTER TABLE IF EXISTS public.players ALTER COLUMN nrc_salt DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Academy email must be unique regardless of casing. Skip the index (with a
-- notice) when duplicates already exist so the migration can still complete.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT LOWER(TRIM(email)) AS normalized_email
    FROM public.academies
    WHERE email IS NOT NULL AND TRIM(email) <> ''
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Skipping idx_academies_email_lower_unique: % duplicate email group(s) found. Resolve duplicates then create the index manually.', duplicate_count;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_academies_email_lower_unique
      ON public.academies (LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) <> '';
  END IF;
END $$;
