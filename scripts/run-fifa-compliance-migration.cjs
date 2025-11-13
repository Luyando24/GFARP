const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runFifaComplianceMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the FIFA compliance schema file
    const schemaPath = path.join(__dirname, '..', 'db', 'fifa_compliance_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    await client.query(schema);
    console.log('✅ FIFA compliance schema created successfully');

    // Insert some sample data for testing
    const sampleData = `
      -- Insert sample FIFA compliance areas for existing academies
      INSERT INTO fifa_compliance_areas (academy_id, area_name, area_type, compliance_score, status, description, issues_count)
      SELECT 
        id as academy_id,
        'Player Registration' as area_name,
        'player_registration' as area_type,
        98 as compliance_score,
        'compliant' as status,
        'All player registrations are up to date and compliant with FIFA regulations' as description,
        0 as issues_count
      FROM academies 
      WHERE EXISTS (SELECT 1 FROM academies)
      ON CONFLICT (academy_id, area_type) DO NOTHING;

      INSERT INTO fifa_compliance_areas (academy_id, area_name, area_type, compliance_score, status, description, issues_count)
      SELECT 
        id as academy_id,
        'Training Compensation' as area_name,
        'training_compensation' as area_type,
        95 as compliance_score,
        'compliant' as status,
        'Training compensation calculations and payments are properly managed' as description,
        0 as issues_count
      FROM academies 
      WHERE EXISTS (SELECT 1 FROM academies)
      ON CONFLICT (academy_id, area_type) DO NOTHING;

      INSERT INTO fifa_compliance_areas (academy_id, area_name, area_type, compliance_score, status, description, issues_count)
      SELECT 
        id as academy_id,
        'Documentation' as area_name,
        'documentation' as area_type,
        88 as compliance_score,
        'review_required' as status,
        'Some documentation requires updates to meet latest FIFA standards' as description,
        2 as issues_count
      FROM academies 
      WHERE EXISTS (SELECT 1 FROM academies)
      ON CONFLICT (academy_id, area_type) DO NOTHING;

      -- Insert sample FIFA compliance records
      INSERT INTO fifa_compliance (academy_id, compliance_type, title, description, status, priority, due_date, reviewer_name)
      SELECT 
        id as academy_id,
        'player_registration' as compliance_type,
        'New Player Registration Compliance Check' as title,
        'Compliance verification for newly registered players' as description,
        'pending' as status,
        'high' as priority,
        (CURRENT_DATE + INTERVAL '7 days') as due_date,
        'FIFA Compliance Officer' as reviewer_name
      FROM academies 
      WHERE EXISTS (SELECT 1 FROM academies)
      LIMIT 1;

      INSERT INTO fifa_compliance (academy_id, compliance_type, title, description, status, priority, due_date, reviewer_name)
      SELECT 
        id as academy_id,
        'academy_licensing' as compliance_type,
        'Annual Academy Licensing Review' as title,
        'Annual review of academy licensing compliance' as description,
        'under_review' as status,
        'high' as priority,
        (CURRENT_DATE + INTERVAL '14 days') as due_date,
        'FIFA Licensing Officer' as reviewer_name
      FROM academies 
      WHERE EXISTS (SELECT 1 FROM academies)
      LIMIT 1;

      -- Insert sample audit history
      INSERT INTO fifa_compliance_audits (academy_id, audit_date, audit_type, auditor_name, auditor_organization, overall_score, result, findings)
      SELECT 
        id as academy_id,
        (CURRENT_DATE - INTERVAL '30 days') as audit_date,
        'fifa_inspection' as audit_type,
        'FIFA Regional Office' as auditor_name,
        'FIFA' as auditor_organization,
        95 as overall_score,
        'passed' as result,
        'Excellent compliance standards maintained' as findings
      FROM academies 
      WHERE EXISTS (SELECT 1 FROM academies)
      LIMIT 1;
    `;

    await client.query(sampleData);
    console.log('📥 Sample FIFA compliance data inserted successfully');

  } catch (error) {
    console.error('❌ Error running FIFA compliance migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
runFifaComplianceMigration()
  .then(() => {
    console.log('FIFA compliance migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('FIFA compliance migration failed:', error);
    process.exit(1);
  });