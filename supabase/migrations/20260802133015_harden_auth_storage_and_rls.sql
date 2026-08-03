-- Security hardening for the custom-JWT application architecture.
-- Browser clients do not authenticate with Supabase Auth, so private data is
-- intentionally available only through the application server/service role.

CREATE TABLE IF NOT EXISTS public."Admin" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SUPERADMIN')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.players
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS career_history TEXT,
  ADD COLUMN IF NOT EXISTS honours TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS video_links TEXT[],
  ADD COLUMN IF NOT EXISTS transfermarket_link VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[],
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS social_links JSONB,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE IF EXISTS public.subscription_plans
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'ACADEMY';

UPDATE public.subscription_plans
SET target_type = 'ACADEMY'
WHERE target_type NOT IN ('ACADEMY', 'INDIVIDUAL', 'AGENCY');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plans_target_type_check'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_target_type_check
      CHECK (target_type IN ('ACADEMY', 'INDIVIDUAL', 'AGENCY'));
  END IF;
END
$$;

INSERT INTO public.subscription_plans (
  name, description, price, currency, billing_cycle, player_limit,
  storage_limit, features, is_active, is_free, sort_order, target_type
) VALUES
  ('Pro Plan', 'Professional features for established academies', 49.99, 'USD', 'MONTHLY', 500,
   10737418240, '["Advanced analytics", "Priority support", "API access"]'::jsonb,
   true, false, 10, 'ACADEMY'),
  ('Elite Plan', 'Comprehensive suite for large organizations', 99.99, 'USD', 'MONTHLY', -1,
   53687091200, '["Unlimited players", "Full FIFA compliance", "Dedicated manager"]'::jsonb,
   true, false, 20, 'ACADEMY'),
  ('Individual Free', 'Basic player profile and public link', 0.00, 'USD', 'LIFETIME', 1,
   536870912, '["Basic player profile", "Public profile link"]'::jsonb,
   true, true, 0, 'INDIVIDUAL'),
  ('Individual Pro', 'Advanced tools for rising players', 19.99, 'USD', 'LIFETIME', 1,
   5368709120, '["Video highlights", "Verified player badge", "Priority support"]'::jsonb,
   true, false, 10, 'INDIVIDUAL'),
  ('Individual Lifetime', 'Lifetime professional player access', 49.99, 'USD', 'LIFETIME', 1,
   10737418240, '["Featured profile", "Lifetime updates", "10GB storage"]'::jsonb,
   true, false, 20, 'INDIVIDUAL'),
  ('Basic Agency', 'For growing talent agencies', 99.99, 'USD', 'MONTHLY', 100,
   10737418240, '["100 player profiles", "Agency branding", "Document management"]'::jsonb,
   true, false, 0, 'AGENCY'),
  ('Professional Agency', 'Advanced tools for busy agencies', 299.99, 'USD', 'MONTHLY', 500,
   53687091200, '["500 player profiles", "Advanced analytics", "Priority support"]'::jsonb,
   true, false, 10, 'AGENCY'),
  ('Enterprise Agency', 'Maximum capacity for large agencies', 999.99, 'USD', 'MONTHLY', 2000,
   214748364800, '["2000 player profiles", "Dedicated manager", "White-label options"]'::jsonb,
   true, false, 20, 'AGENCY')
ON CONFLICT (name) DO UPDATE
SET target_type = EXCLUDED.target_type;

CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  website TEXT,
  bio TEXT,
  logo_url TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.agencies
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE IF EXISTS public.academies
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Keep this hardening migration independently runnable on databases that were
-- provisioned before the Stripe integration migration was introduced.
ALTER TABLE IF EXISTS public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

ALTER TABLE IF EXISTS public.academy_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

ALTER TABLE IF EXISTS public.subscription_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  amount_paid DECIMAL(10,2),
  payment_reference TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  notes TEXT,
  activated_by UUID,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.agency_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Payment/history rows can refer to academy or agency subscriptions. PostgreSQL
-- cannot express that polymorphic reference as a single foreign key.
ALTER TABLE IF EXISTS public.subscription_history
  DROP CONSTRAINT IF EXISTS subscription_history_subscription_id_fkey;
ALTER TABLE IF EXISTS public.subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_subscription_id_fkey;

CREATE TABLE IF NOT EXISTS public.individual_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender VARCHAR(10),
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.individual_players(id) ON DELETE CASCADE,
  display_name VARCHAR(200),
  age INTEGER CHECK (age IS NULL OR age BETWEEN 5 AND 100),
  nationality VARCHAR(100),
  position VARCHAR(100),
  current_club VARCHAR(200),
  video_links TEXT[],
  transfermarket_link TEXT,
  bio TEXT,
  profile_image_url TEXT,
  gallery_images TEXT[],
  height NUMERIC,
  weight NUMERIC,
  preferred_foot VARCHAR(50),
  cover_image_url TEXT,
  career_history TEXT,
  honours TEXT,
  education TEXT,
  contact_email VARCHAR(255),
  whatsapp_number VARCHAR(50),
  social_links JSONB,
  slug VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  guardian_name VARCHAR(200),
  guardian_phone VARCHAR(50),
  guardian_email VARCHAR(255),
  guardian_info TEXT,
  medical_info TEXT,
  emergency_contact VARCHAR(200),
  emergency_phone VARCHAR(50),
  playing_history TEXT,
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.individual_players(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  stripe_session_id TEXT UNIQUE,
  receipt_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.player_purchases
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.exempted_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  module TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, module)
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL
    CHECK (discount_percent > 0 AND discount_percent <= 100),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.individual_players
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE IF EXISTS public.player_profiles
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[],
  ADD COLUMN IF NOT EXISTS height NUMERIC,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS career_history TEXT,
  ADD COLUMN IF NOT EXISTS honours TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS social_links JSONB,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guardian_info TEXT,
  ADD COLUMN IF NOT EXISTS medical_info TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(200),
  ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS playing_history TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE IF EXISTS public.subscription_payments
  ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.player_purchases
  ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.financial_transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.sales_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  code VARCHAR(50) UNIQUE,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.academies
  ADD COLUMN IF NOT EXISTS sales_agent_id UUID
    REFERENCES public.sales_agents(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_agent_id UUID REFERENCES public.sales_agents(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY academy_id
    ORDER BY COALESCE(activated_at, start_date, created_at) DESC, created_at DESC, id DESC
  ) AS row_number
  FROM public.academy_subscriptions
  WHERE status = 'ACTIVE'
)
UPDATE public.academy_subscriptions subscription
SET status = 'CANCELLED', updated_at = now()
FROM ranked
WHERE subscription.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY agency_id
    ORDER BY COALESCE(activated_at, start_date, created_at) DESC, created_at DESC, id DESC
  ) AS row_number
  FROM public.agency_subscriptions
  WHERE status = 'ACTIVE'
)
UPDATE public.agency_subscriptions subscription
SET status = 'CANCELLED', updated_at = now()
FROM ranked
WHERE subscription.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY slug ORDER BY updated_at DESC, created_at DESC, id DESC
  ) AS row_number
  FROM public.players
  WHERE slug IS NOT NULL
)
UPDATE public.players player
SET slug = NULL, updated_at = now()
FROM ranked
WHERE player.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY slug ORDER BY updated_at DESC, created_at DESC, id DESC
  ) AS row_number
  FROM public.player_profiles
  WHERE slug IS NOT NULL
)
UPDATE public.player_profiles profile
SET slug = NULL, updated_at = now()
FROM ranked
WHERE profile.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY stripe_subscription_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.academy_subscriptions
  WHERE stripe_subscription_id IS NOT NULL
)
UPDATE public.academy_subscriptions subscription
SET stripe_subscription_id = NULL, updated_at = now()
FROM ranked
WHERE subscription.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY stripe_subscription_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.agency_subscriptions
  WHERE stripe_subscription_id IS NOT NULL
)
UPDATE public.agency_subscriptions subscription
SET stripe_subscription_id = NULL, updated_at = now()
FROM ranked
WHERE subscription.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY stripe_invoice_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.subscription_payments
  WHERE stripe_invoice_id IS NOT NULL
)
UPDATE public.subscription_payments payment
SET stripe_invoice_id = NULL
FROM ranked
WHERE payment.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY stripe_session_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.player_purchases
  WHERE stripe_session_id IS NOT NULL
)
UPDATE public.player_purchases purchase
SET stripe_session_id = NULL, updated_at = now()
FROM ranked
WHERE purchase.id = ranked.id AND ranked.row_number > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY stripe_payment_intent_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.financial_transactions
  WHERE stripe_payment_intent_id IS NOT NULL
)
UPDATE public.financial_transactions financial_row
SET stripe_payment_intent_id = NULL, updated_at = now()
FROM ranked
WHERE financial_row.id = ranked.id AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS players_slug_unique
  ON public.players (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS player_profiles_slug_unique
  ON public.player_profiles (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS individual_players_verification_token_idx
  ON public.individual_players (verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS player_purchases_player_status_idx
  ON public.player_purchases (player_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS player_purchases_stripe_session_unique
  ON public.player_purchases (stripe_session_id);
CREATE INDEX IF NOT EXISTS commissions_sales_agent_idx
  ON public.commissions (sales_agent_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS academy_subscriptions_stripe_subscription_unique
  ON public.academy_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agency_subscriptions_agency_idx
  ON public.agency_subscriptions (agency_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS agency_subscriptions_one_active_per_agency_idx
  ON public.agency_subscriptions (agency_id)
  WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS agency_subscriptions_stripe_subscription_unique
  ON public.agency_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_stripe_invoice_unique
  ON public.subscription_payments (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS financial_transactions_stripe_intent_unique
  ON public.financial_transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('player-documents', 'player-documents', false, 10485760,
    ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('compliance-documents', 'compliance-documents', false, 10485760,
    ARRAY['image/jpeg','image/png','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('public-uploads', 'public-uploads', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Legacy browser-direct upload policies on player-images allow any public
-- caller to create, replace, or delete objects. Current uploads are mediated
-- by authenticated server routes using the service role. Keep the existing
-- public-read policy/bucket behavior so previously stored profile URLs work.
DROP POLICY IF EXISTS player_images_insert ON storage.objects;
DROP POLICY IF EXISTS player_images_update ON storage.objects;
DROP POLICY IF EXISTS player_images_delete ON storage.objects;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END
$$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- All writes are performed by authenticated application servers. Do not add
-- broad anon/authenticated storage policies for these buckets.
