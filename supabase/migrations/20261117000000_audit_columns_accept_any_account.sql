-- Audit columns that record "who did this" hold the id of whichever account
-- performed the action: an academy owner, an agency, a platform admin, a staff
-- member or an individual player. Constraining them to staff_users makes every
-- upload by a non-staff account fail with a 23503 foreign key violation.
-- Nothing joins these columns to staff_users, so dropping the constraints only
-- removes the false guarantee.

ALTER TABLE player_documents
  DROP CONSTRAINT IF EXISTS player_documents_uploaded_by_fkey;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
