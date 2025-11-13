-- Migration: Add academy_id column to players table
-- This migration adds the missing academy_id column to link players to academies

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_players_academy ON players(academy_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'academy_id';