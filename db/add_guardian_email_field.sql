-- Add guardian email field to players table
-- This migration adds an encrypted guardian email field

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS guardian_contact_email_cipher BYTEA;

-- Add comment for documentation
COMMENT ON COLUMN players.guardian_contact_email_cipher IS 'Guardian/parent email address (encrypted)';