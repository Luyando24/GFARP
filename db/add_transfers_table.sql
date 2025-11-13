-- Create transfers table for player transfer management
-- This table tracks all player transfers between clubs/academies

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  
  -- Transfer details
  player_name TEXT NOT NULL, -- Encrypted player name for quick access
  from_club TEXT NOT NULL,
  to_club TEXT NOT NULL,
  transfer_amount DECIMAL(12,2), -- Amount in USD
  currency TEXT DEFAULT 'USD',
  
  -- Transfer dates
  transfer_date DATE NOT NULL,
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected', 'cancelled')),
  transfer_type TEXT DEFAULT 'permanent' CHECK (transfer_type IN ('permanent', 'loan', 'free_transfer')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Additional information
  agent_name TEXT,
  agent_fee DECIMAL(10,2),
  notes TEXT,
  documents JSONB DEFAULT '[]', -- Array of document references
  
  -- FIFA compliance
  fifa_clearance_status TEXT DEFAULT 'pending' CHECK (fifa_clearance_status IN ('pending', 'approved', 'rejected')),
  fifa_clearance_date DATE,
  
  -- Audit fields (will add foreign keys when staff_users table exists)
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfers_academy ON transfers(academy_id);
CREATE INDEX IF NOT EXISTS idx_transfers_player ON transfers(player_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_transfers_updated_at();

-- Insert some sample data for testing
INSERT INTO transfers (
  academy_id,
  player_name,
  from_club,
  to_club,
  transfer_amount,
  transfer_date,
  status,
  transfer_type,
  priority,
  agent_name,
  notes
) VALUES 
(
  (SELECT id FROM academies LIMIT 1), -- Use first academy if available
  'James Sakala',
  'Elite Football Academy',
  'Nkana FC',
  15000.00,
  '2024-01-15',
  'completed',
  'permanent',
  'high',
  'John Mwanza',
  'Promising young striker with excellent potential'
),
(
  (SELECT id FROM academies LIMIT 1),
  'Mary Chanda',
  'Elite Football Academy', 
  'Green Buffaloes',
  12000.00,
  '2024-01-10',
  'pending',
  'permanent',
  'medium',
  'Sarah Phiri',
  'Talented midfielder, needs FIFA clearance'
),
(
  (SELECT id FROM academies LIMIT 1),
  'Peter Banda',
  'Champions Youth FC',
  'Zanaco FC',
  8500.00,
  '2024-01-05',
  'approved',
  'loan',
  'medium',
  'Michael Tembo',
  '6-month loan deal with option to buy'
)
ON CONFLICT DO NOTHING;