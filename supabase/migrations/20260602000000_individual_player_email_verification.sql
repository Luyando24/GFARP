-- Email verification for individual player self-registration
ALTER TABLE individual_players
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Existing accounts are grandfathered as verified
UPDATE individual_players SET email_verified = TRUE WHERE email_verified IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_individual_players_verification_token
ON individual_players(verification_token);
