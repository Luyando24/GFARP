-- Add missing fields to players table for proper data persistence
-- This migration adds columns for nationality, training dates, emergency phone, internal notes, and additional notes

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS training_start_date DATE,
ADD COLUMN IF NOT EXISTS training_end_date DATE,
ADD COLUMN IF NOT EXISTS emergency_phone_cipher BYTEA,
ADD COLUMN IF NOT EXISTS internal_notes_cipher BYTEA,
ADD COLUMN IF NOT EXISTS notes_cipher BYTEA;

-- Create indexes for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality);
CREATE INDEX IF NOT EXISTS idx_players_training_dates ON players(training_start_date, training_end_date);

-- Add comments for documentation
COMMENT ON COLUMN players.nationality IS 'Player nationality (non-encrypted)';
COMMENT ON COLUMN players.training_start_date IS 'Training program start date';
COMMENT ON COLUMN players.training_end_date IS 'Training program end date';
COMMENT ON COLUMN players.emergency_phone_cipher IS 'Emergency contact phone number (encrypted)';
COMMENT ON COLUMN players.internal_notes_cipher IS 'Internal staff notes about the player (encrypted)';
COMMENT ON COLUMN players.notes_cipher IS 'Additional notes about the player (encrypted)';