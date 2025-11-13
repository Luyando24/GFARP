-- FIFA Compliance Schema
-- This schema handles FIFA compliance management for academies

-- FIFA Compliance Records
CREATE TABLE IF NOT EXISTS fifa_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  compliance_type TEXT NOT NULL CHECK (compliance_type IN (
    'player_registration', 
    'transfer_compliance', 
    'academy_licensing', 
    'financial_fair_play', 
    'youth_protection',
    'training_compensation',
    'solidarity_mechanism',
    'documentation_review'
  )),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'under_review', 
    'approved', 
    'rejected', 
    'flagged',
    'requires_action'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  submission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  review_date TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  reviewer_id UUID,
  reviewer_name TEXT,
  reviewer_comments TEXT,
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FIFA Compliance Documents
CREATE TABLE IF NOT EXISTS fifa_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_id UUID NOT NULL REFERENCES fifa_compliance(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'contract', 
    'medical_certificate', 
    'fifa_clearance', 
    'international_clearance',
    'age_verification',
    'transfer_agreement',
    'fifa_tms_certificate',
    'academy_license',
    'facility_inspection_report',
    'coach_certifications',
    'financial_statements',
    'audit_report',
    'transaction_records',
    'safeguarding_policy',
    'background_checks',
    'training_certificates',
    'other'
  )),
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  expiry_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FIFA Compliance Areas (for tracking different compliance aspects)
CREATE TABLE IF NOT EXISTS fifa_compliance_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  area_type TEXT NOT NULL CHECK (area_type IN (
    'player_registration',
    'training_compensation',
    'documentation',
    'solidarity_mechanism',
    'transfer_regulations',
    'youth_protection'
  )),
  compliance_score INTEGER NOT NULL DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('compliant', 'non_compliant', 'review_required', 'pending')),
  last_check_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  issues_count INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique area per academy
  UNIQUE(academy_id, area_type)
);

-- FIFA Compliance Action Items
CREATE TABLE IF NOT EXISTS fifa_compliance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_id UUID REFERENCES fifa_compliance(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FIFA Compliance Audit History
CREATE TABLE IF NOT EXISTS fifa_compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  audit_date TIMESTAMPTZ NOT NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('fifa_inspection', 'internal_audit', 'external_review')),
  auditor_name TEXT NOT NULL,
  auditor_organization TEXT,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  result TEXT NOT NULL CHECK (result IN ('passed', 'failed', 'conditional_pass')),
  findings TEXT,
  recommendations TEXT,
  next_audit_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FIFA Compliance Comments/Communication
CREATE TABLE IF NOT EXISTS fifa_compliance_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_id UUID NOT NULL REFERENCES fifa_compliance(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('academy_staff', 'fifa_officer', 'system', 'admin')),
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_academy_id ON fifa_compliance(academy_id);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_status ON fifa_compliance(status);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_type ON fifa_compliance(compliance_type);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_due_date ON fifa_compliance(due_date);

CREATE INDEX IF NOT EXISTS idx_fifa_compliance_documents_compliance_id ON fifa_compliance_documents(compliance_id);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_documents_type ON fifa_compliance_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_fifa_compliance_areas_academy_id ON fifa_compliance_areas(academy_id);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_areas_type ON fifa_compliance_areas(area_type);

CREATE INDEX IF NOT EXISTS idx_fifa_compliance_actions_academy_id ON fifa_compliance_actions(academy_id);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_actions_status ON fifa_compliance_actions(status);

CREATE INDEX IF NOT EXISTS idx_fifa_compliance_audits_academy_id ON fifa_compliance_audits(academy_id);
CREATE INDEX IF NOT EXISTS idx_fifa_compliance_audits_date ON fifa_compliance_audits(audit_date);

CREATE INDEX IF NOT EXISTS idx_fifa_compliance_comments_compliance_id ON fifa_compliance_comments(compliance_id);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Make triggers idempotent by dropping existing ones before creating
DROP TRIGGER IF EXISTS update_fifa_compliance_updated_at ON fifa_compliance;
DROP TRIGGER IF EXISTS update_fifa_compliance_documents_updated_at ON fifa_compliance_documents;
DROP TRIGGER IF EXISTS update_fifa_compliance_areas_updated_at ON fifa_compliance_areas;
DROP TRIGGER IF EXISTS update_fifa_compliance_actions_updated_at ON fifa_compliance_actions;
DROP TRIGGER IF EXISTS update_fifa_compliance_audits_updated_at ON fifa_compliance_audits;
DROP TRIGGER IF EXISTS update_fifa_compliance_comments_updated_at ON fifa_compliance_comments;

CREATE TRIGGER update_fifa_compliance_updated_at BEFORE UPDATE ON fifa_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fifa_compliance_documents_updated_at BEFORE UPDATE ON fifa_compliance_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fifa_compliance_areas_updated_at BEFORE UPDATE ON fifa_compliance_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fifa_compliance_actions_updated_at BEFORE UPDATE ON fifa_compliance_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fifa_compliance_audits_updated_at BEFORE UPDATE ON fifa_compliance_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fifa_compliance_comments_updated_at BEFORE UPDATE ON fifa_compliance_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();