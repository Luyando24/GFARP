-- Gender selected by an individual player during account registration.
-- Existing accounts remain nullable; new registrations require this field in
-- the authenticated Express API.

ALTER TABLE individual_players
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'individual_players_gender_check'
      AND conrelid = 'individual_players'::regclass
  ) THEN
    ALTER TABLE individual_players
      ADD CONSTRAINT individual_players_gender_check
      CHECK (gender IS NULL OR gender IN ('male', 'female'));
  END IF;
END $$;
