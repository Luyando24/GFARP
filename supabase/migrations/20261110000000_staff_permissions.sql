-- Staff administrators are scoped to individual modules instead of the whole
-- academy. Existing staff previously had unrestricted access, so the backfill
-- preserves their current behaviour; new accounts start with the permissions
-- the academy owner selects.
ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT '{}';

UPDATE staff_users
SET permissions = ARRAY['players', 'training', 'transfers', 'finances', 'compliance']
WHERE permissions IS NULL OR permissions = '{}';
