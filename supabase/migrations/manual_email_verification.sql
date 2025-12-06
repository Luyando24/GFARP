-- Add email verification columns to staff_users table
ALTER TABLE staff_users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Create an index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_staff_users_verification_token ON staff_users(verification_token);
