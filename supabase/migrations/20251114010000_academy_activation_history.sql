-- Academy Activation History and Audit Log Schema
-- This table tracks all activation/deactivation actions for academies

CREATE TABLE IF NOT EXISTS academy_activation_history (
    id SERIAL PRIMARY KEY,
    academy_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('activate', 'deactivate', 'verify', 'unverify')),
    previous_status BOOLEAN,
    new_status BOOLEAN NOT NULL,
    admin_id UUID,
    admin_email VARCHAR(255),
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_academy_activation_history_academy 
        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_academy_activation_history_academy_id 
    ON academy_activation_history(academy_id);

CREATE INDEX IF NOT EXISTS idx_academy_activation_history_created_at 
    ON academy_activation_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_academy_activation_history_action_type 
    ON academy_activation_history(action_type);

CREATE INDEX IF NOT EXISTS idx_academy_activation_history_admin_email 
    ON academy_activation_history(admin_email);

-- Comments for documentation
COMMENT ON TABLE academy_activation_history IS 'Tracks all activation, deactivation, verification, and unverification actions for academies';
COMMENT ON COLUMN academy_activation_history.academy_id IS 'Reference to the academy that was modified';
COMMENT ON COLUMN academy_activation_history.action_type IS 'Type of action performed: activate, deactivate, verify, unverify';
COMMENT ON COLUMN academy_activation_history.previous_status IS 'Previous status before the action (null for new records)';
COMMENT ON COLUMN academy_activation_history.new_status IS 'New status after the action';
COMMENT ON COLUMN academy_activation_history.admin_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN academy_activation_history.admin_email IS 'Email of the admin who performed the action';
COMMENT ON COLUMN academy_activation_history.reason IS 'Optional reason for the action';
COMMENT ON COLUMN academy_activation_history.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN academy_activation_history.user_agent IS 'User agent of the browser/client used';