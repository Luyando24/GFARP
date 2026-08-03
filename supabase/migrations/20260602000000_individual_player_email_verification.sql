-- Email verification for individual player self-registration
-- Older deployments created these tables manually. Keep the migration chain
-- self-contained so a fresh database reaches the same schema.
CREATE TABLE IF NOT EXISTS individual_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES individual_players(id) ON DELETE CASCADE,
  display_name VARCHAR(200),
  age INTEGER,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES individual_players(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exempted_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  module TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, module)
);

ALTER TABLE individual_players
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Existing accounts are grandfathered as verified
UPDATE individual_players SET email_verified = TRUE WHERE email_verified IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_individual_players_verification_token
ON individual_players(verification_token);
