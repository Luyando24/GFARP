-- Add missing contact information fields to players table
-- This migration adds columns for current club, city, and country

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS current_club_cipher BYTEA,
ADD COLUMN IF NOT EXISTS city_cipher BYTEA,
ADD COLUMN IF NOT EXISTS country_cipher BYTEA;

-- Add comments for documentation
COMMENT ON COLUMN players.current_club_cipher IS 'Player current club information (encrypted)';
COMMENT ON COLUMN players.city_cipher IS 'Player city information (encrypted)';
COMMENT ON COLUMN players.country_cipher IS 'Player country information (encrypted)';