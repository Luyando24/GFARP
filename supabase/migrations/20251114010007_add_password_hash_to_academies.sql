-- Add password_hash column to academies table
ALTER TABLE academies ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add comment to the column
COMMENT ON COLUMN academies.password_hash IS 'Password hash for academy login authentication';