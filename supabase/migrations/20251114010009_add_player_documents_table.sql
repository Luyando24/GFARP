-- Add player documents table for permanent document storage
-- This table will store metadata about uploaded player documents

CREATE TABLE IF NOT EXISTS player_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport_id', 'player_photo', 'proof_of_training', 'birth_certificate')),
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase storage path
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES staff_users(id) ON DELETE SET NULL, -- Who uploaded the document
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- For soft deletion/versioning
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_player_documents_player_id ON player_documents(player_id);
CREATE INDEX IF NOT EXISTS idx_player_documents_type ON player_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_player_documents_active ON player_documents(is_active);

-- Unique constraint to prevent duplicate active documents of the same type per player
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_documents_unique_active 
ON player_documents(player_id, document_type) 
WHERE is_active = true;

-- Add document status fields to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS documents_uploaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS documents_last_updated TIMESTAMPTZ;

-- Function to update player document status
CREATE OR REPLACE FUNCTION update_player_document_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the player's document status
  UPDATE players 
  SET 
    documents_uploaded = (
      SELECT COUNT(*) >= 3 -- passport_id, player_photo, proof_of_training are required
      FROM player_documents 
      WHERE player_id = COALESCE(NEW.player_id, OLD.player_id)
        AND document_type IN ('passport_id', 'player_photo', 'proof_of_training')
        AND is_active = true
    ),
    documents_last_updated = NOW()
  WHERE id = COALESCE(NEW.player_id, OLD.player_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update player document status
DROP TRIGGER IF EXISTS trigger_update_player_document_status ON player_documents;
CREATE TRIGGER trigger_update_player_document_status
  AFTER INSERT OR UPDATE OR DELETE ON player_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_player_document_status();