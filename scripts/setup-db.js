// Database setup script for SOFWAN Management System
// Run this after installing PostgreSQL locally

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Don't specify database initially - we'll create it
};

const targetDbName = process.env.DB_NAME || 'sofwan_db';

async function setupDatabase() {
  console.log('🚀 Setting up SOFWAN Management PostgreSQL database...');
  
  try {
    // Connect to PostgreSQL server (without specifying database)
    console.log(`🔍 Connecting to PostgreSQL as user: ${dbConfig.user}`);
    const client = new Client(dbConfig);
    await client.connect();
    console.log(`✅ Successfully connected to PostgreSQL server`);
    
    // Create database if it doesn't exist
    console.log(`📝 Creating database ${targetDbName} if it doesn't exist...`);
    await client.query(`CREATE DATABASE "${targetDbName}"`).catch(err => {
      if (err.code !== '42P04') { // Database already exists error code
        throw err;
      }
      console.log(`ℹ️ Database ${targetDbName} already exists`);
    });
    console.log(`✅ Database ${targetDbName} is ready`);
    
    // Close the initial connection
    await client.end();
    
    // Connect to the specific database
    const dbClient = new Client({
      ...dbConfig,
      database: targetDbName
    });
    await dbClient.connect();
    
    console.log(`✅ Connected to ${targetDbName} database`);
    
    // Read and execute the PostgreSQL schema
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Dropping existing tables if they exist...');
    
    // Drop existing tables in correct order (reverse dependency order)
    const dropStatements = [
      'DROP TABLE IF EXISTS sync_ingest CASCADE',
      'DROP TABLE IF EXISTS website_media CASCADE',
      'DROP TABLE IF EXISTS website_components CASCADE',
      'DROP TABLE IF EXISTS website_pages CASCADE',
      'DROP TABLE IF EXISTS website_themes CASCADE',
      'DROP TABLE IF EXISTS academy_websites CASCADE',
      'DROP TABLE IF EXISTS matches CASCADE',
      'DROP TABLE IF EXISTS training_attendance CASCADE',
      'DROP TABLE IF EXISTS player_performance CASCADE',
      'DROP TABLE IF EXISTS team_memberships CASCADE',
      'DROP TABLE IF EXISTS training_sessions CASCADE',
      'DROP TABLE IF EXISTS teams CASCADE',
      'DROP TABLE IF EXISTS coaches CASCADE',
      'DROP TABLE IF EXISTS players CASCADE',
      'DROP TABLE IF EXISTS staff_users CASCADE',
      'DROP TABLE IF EXISTS academies CASCADE'
    ];
    
    for (const dropStmt of dropStatements) {
      await dbClient.query(dropStmt);
    }
    
    console.log('📋 Executing database schema...');
    
    // Split schema into individual statements and execute them
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await dbClient.query(statement.trim());
      }
    }
    
    // Insert sample data
    console.log('🌱 Inserting sample data...');
    
    // Create a sample soccer academy
    const academyId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    await dbClient.query(`
      INSERT INTO academies (id, name, code, address, district, province, phone, academy_type, director_name, director_email, founded_year, facilities)
      VALUES ($1, 'SOFWAN Demo Academy', 'SDA01', '123 Football Street', 'Lusaka', 'Lusaka', '+260-123-456789', 'youth', 'John Banda', 'director@sofwan.demo', 2020, ARRAY['grass_field', 'artificial_turf', 'gym', 'dormitory'])
      ON CONFLICT (id) DO NOTHING
    `, [academyId]);
    
    // Create a sample academy admin user
    const bcrypt = await import('bcrypt');
    const adminPassword = await bcrypt.default.hash('admin123', 12);
    const adminId = 'a47ac10b-58cc-4372-a567-0e02b2c3d480';
    
    await dbClient.query(`
      INSERT INTO staff_users (id, academy_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, 'admin@sofwan.demo', $3, 'academy_admin', 'Academy', 'Admin', true)
      ON CONFLICT (id) DO NOTHING
    `, [adminId, academyId, adminPassword]);

    // Create a head coach user
    const headCoachPassword = await bcrypt.default.hash('coach123', 12);
    const headCoachId = 'c47ac10b-58cc-4372-a567-0e02b2c3d482';
    
    await dbClient.query(`
      INSERT INTO staff_users (id, academy_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, 'headcoach@sofwan.demo', $3, 'head_coach', 'Head', 'Coach', true)
      ON CONFLICT (id) DO NOTHING
    `, [headCoachId, academyId, headCoachPassword]);

    // Create a super admin user
    const superAdminPassword = await bcrypt.default.hash('admin123', 12);
    const superAdminId = 'b47ac10b-58cc-4372-a567-0e02b2c3d481';
    
    await dbClient.query(`
      INSERT INTO staff_users (id, academy_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, NULL, 'admin@system.com', $2, 'superadmin', 'Super', 'Admin', true)
      ON CONFLICT (id) DO NOTHING
    `, [superAdminId, superAdminPassword]);

    // Create coach record for the head coach
    await dbClient.query(`
      INSERT INTO coaches (id, staff_user_id, academy_id, employee_id, specialization, license_level, experience_years, playing_background, is_head_coach)
      VALUES (gen_random_uuid(), $1, $2, 'HC001', 'youth_development', 'CAF B', 8, 'Former professional player with Zambia National Team', true)
      ON CONFLICT (staff_user_id) DO NOTHING
    `, [headCoachId, academyId]);

    // Create a sample team
    const teamId = 'd47ac10b-58cc-4372-a567-0e02b2c3d483';
    await dbClient.query(`
      INSERT INTO teams (id, academy_id, name, age_group, season, head_coach_id, team_color, home_ground)
      VALUES ($1, $2, 'SOFWAN U16 Lions', 'U16', '2024', (SELECT id FROM coaches WHERE staff_user_id = $3), 'Blue and White', 'SOFWAN Training Ground')
      ON CONFLICT (id) DO NOTHING
    `, [teamId, academyId, headCoachId]);

    // Create sample players
    const playersData = [
      { id: 'e47ac10b-58cc-4372-a567-0e02b2c3d484', cardId: 'PL001A', firstName: 'Chisomo', lastName: 'Mwanza', position: 'midfielder', jerseyNumber: 10 },
      { id: 'e47ac10b-58cc-4372-a567-0e02b2c3d485', cardId: 'PL002B', firstName: 'Kabwe', lastName: 'Phiri', position: 'forward', jerseyNumber: 9 },
      { id: 'e47ac10b-58cc-4372-a567-0e02b2c3d486', cardId: 'PL003C', firstName: 'Mulenga', lastName: 'Banda', position: 'defender', jerseyNumber: 4 }
    ];

    for (const player of playersData) {
      // Create encrypted sample data (in real implementation, this would be properly encrypted)
      const sampleNrcHash = await bcrypt.default.hash(`NRC${player.id.slice(-6)}`, 10);
      const sampleNrcSalt = `salt_${player.id.slice(-6)}`;
      
      await dbClient.query(`
        INSERT INTO players (id, player_card_id, nrc_hash, nrc_salt, first_name_cipher, last_name_cipher, 
                           gender, position, preferred_foot, jersey_number, registration_date, card_id, card_qr_signature)
        VALUES ($1, $2, $3, $4, $5, $6, 'male', $7, 'right', $8, CURRENT_DATE, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        player.id, 
        player.cardId, 
        sampleNrcHash, 
        sampleNrcSalt, 
        Buffer.from(player.firstName), // Simplified encryption for demo
        Buffer.from(player.lastName),
        player.position,
        player.jerseyNumber,
        player.cardId,
        `qr_sig_${player.cardId}`
      ]);

      // Add player to team
      await dbClient.query(`
        INSERT INTO team_memberships (id, team_id, player_id, jersey_number, position)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT (team_id, player_id) DO NOTHING
      `, [teamId, player.id, player.jerseyNumber, player.position]);
    }
    
    console.log('✅ Sample data inserted');
    console.log('✅ Database schema executed successfully!');
    console.log('🎉 SOFWAN Soccer Academy Management PostgreSQL database setup complete!');
    console.log('');
    console.log('Sample login credentials:');
    console.log('Academy Admin:');
    console.log('  Email: admin@sofwan.demo');
    console.log('  Password: admin123');
    console.log('');
    console.log('Head Coach:');
    console.log('  Email: headcoach@sofwan.demo');
    console.log('  Password: coach123');
    console.log('');
    console.log('Super Admin:');
    console.log('  Email: admin@system.com');
    console.log('  Password: admin123');
    console.log('  Login URL: /admin/login');
    
    await dbClient.end();
    
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL database:', error.message);
    console.log('💡 Make sure PostgreSQL is installed and running');
    console.log('💡 You can download PostgreSQL from: https://www.postgresql.org/download/');
    process.exit(1);
  }
}

// Run the setup function
setupDatabase();

export { setupDatabase };