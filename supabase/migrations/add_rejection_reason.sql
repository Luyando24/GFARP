-- Add rejection_reason column to fifa_compliance_documents table
ALTER TABLE fifa_compliance_documents 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
