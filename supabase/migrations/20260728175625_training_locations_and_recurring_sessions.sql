-- Reusable academy training locations and grouped recurring sessions.
-- Training records retain a location text snapshot so historical attendance
-- remains readable even if a saved location is renamed or removed later.

CREATE TABLE IF NOT EXISTS training_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT GENERATED ALWAYS AS (LOWER(BTRIM(name))) STORED,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_locations_name_check
    CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 2 AND 200),
  CONSTRAINT training_locations_academy_name_key
    UNIQUE (academy_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS training_session_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location_id UUID REFERENCES training_locations(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  interval_weeks SMALLINT NOT NULL,
  occurrence_count SMALLINT NOT NULL,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_session_series_title_check
    CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 200),
  CONSTRAINT training_session_series_location_check
    CHECK (CHAR_LENGTH(BTRIM(location)) BETWEEN 2 AND 200),
  CONSTRAINT training_session_series_duration_check
    CHECK (duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT training_session_series_interval_check
    CHECK (interval_weeks BETWEEN 1 AND 12),
  CONSTRAINT training_session_series_occurrences_check
    CHECK (occurrence_count BETWEEN 2 AND 52)
);

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS location_id UUID,
  ADD COLUMN IF NOT EXISTS series_id UUID,
  ADD COLUMN IF NOT EXISTS series_sequence SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_location_id_fkey'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_location_id_fkey
      FOREIGN KEY (location_id)
      REFERENCES training_locations(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_series_id_fkey'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_series_id_fkey
      FOREIGN KEY (series_id)
      REFERENCES training_session_series(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_series_sequence_check'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_series_sequence_check
      CHECK (series_sequence IS NULL OR series_sequence BETWEEN 1 AND 52);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_locations_academy_active
  ON training_locations(academy_id, name)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_training_session_series_academy
  ON training_session_series(academy_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_training_session_series_location
  ON training_session_series(location_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_location
  ON training_sessions(location_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_series
  ON training_sessions(series_id, series_sequence);

ALTER TABLE training_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_series ENABLE ROW LEVEL SECURITY;

-- Access is intentionally limited to the authenticated Express API, which
-- enforces academy ownership for academy admins and active staff users.
REVOKE ALL ON TABLE training_locations FROM anon, authenticated;
REVOKE ALL ON TABLE training_session_series FROM anon, authenticated;
