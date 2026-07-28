-- Academy training sessions and polymorphic player attendance.
-- The original schema only supported team-linked sessions and players from the
-- `players` table. Academy rosters also contain self-registered
-- `individual_players`, so attendance stores a player source discriminator and
-- validates ownership in the authenticated server API.

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_number TEXT NOT NULL UNIQUE
    DEFAULT ('TRN-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))),
  coach_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Training Session',
  description TEXT,
  objectives TEXT,
  session_type TEXT NOT NULL DEFAULT 'technical',
  intensity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'scheduled',
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  location TEXT,
  equipment_needed TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE training_sessions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN session_number SET DEFAULT
    ('TRN-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))),
  ALTER COLUMN team_id DROP NOT NULL;

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  player_source VARCHAR(20) NOT NULL DEFAULT 'academy',
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'absent',
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE training_attendance
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS player_source VARCHAR(20) NOT NULL DEFAULT 'academy',
  ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- A polymorphic player can originate from `players` or `individual_players`.
-- Remove the old single-table FK; academy ownership is checked by the server
-- before every attendance upsert.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname
    INTO constraint_name
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'training_attendance'::regclass
    AND c.contype = 'f'
    AND a.attname = 'player_id'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE FORMAT(
      'ALTER TABLE training_attendance DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_status_check'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_status_check
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_sessions_duration_check'
      AND conrelid = 'training_sessions'::regclass
  ) THEN
    ALTER TABLE training_sessions
      ADD CONSTRAINT training_sessions_duration_check
      CHECK (duration_minutes BETWEEN 15 AND 480);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_attendance_player_source_check'
      AND conrelid = 'training_attendance'::regclass
  ) THEN
    ALTER TABLE training_attendance
      ADD CONSTRAINT training_attendance_player_source_check
      CHECK (player_source IN ('academy', 'individual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_attendance_status_check'
      AND conrelid = 'training_attendance'::regclass
  ) THEN
    ALTER TABLE training_attendance
      ADD CONSTRAINT training_attendance_status_check
      CHECK (status IN ('present', 'absent', 'late', 'excused', 'injured'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'training_attendance_session_player_key'
      AND conrelid = 'training_attendance'::regclass
  ) THEN
    ALTER TABLE training_attendance
      ADD CONSTRAINT training_attendance_session_player_key
      UNIQUE (session_id, player_id, player_source);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_sessions_academy_date
  ON training_sessions(academy_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_training_sessions_upcoming
  ON training_sessions(academy_id, session_date)
  WHERE status = 'scheduled' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_training_attendance_session
  ON training_attendance(session_id);

CREATE INDEX IF NOT EXISTS idx_training_attendance_player_history
  ON training_attendance(academy_id, player_source, player_id, marked_at DESC);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- These records are served by authenticated Express endpoints. Do not expose
-- them directly through the public Data API.
REVOKE ALL ON TABLE training_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE training_attendance FROM anon, authenticated;
