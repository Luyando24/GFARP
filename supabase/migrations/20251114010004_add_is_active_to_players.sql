-- Migration: Add is_active column to players table for soft deletion
-- This migration adds the missing is_active column to enable soft deletion of players

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add index for better query performance on active players
CREATE INDEX IF NOT EXISTS idx_players_is_active ON players(is_active);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'is_active';