const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

// Hash password using SHA-256 (matching the existing system)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createStaffAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to Supabase database');

    // Check if staff_users table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff_users'
      );
    `;
    
    const tableExists = await client.query(tableCheckQuery);
    console.log('✅ staff_users table exists:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ staff_users table does not exist. Creating it...');
      
      // Create staff_users table
      const createTableQuery = `
        CREATE TYPE IF NOT EXISTS user_role AS ENUM ('superadmin', 'admin', 'teacher', 'staff');
        
        CREATE TABLE IF NOT EXISTS staff_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role user_role NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      
      await client.query(createTableQuery);
      console.log('✅ staff_users table created');
    }

    // Hash the password
    const hashedPassword = hashPassword('admin123');
    console.log('🔐 Password hashed successfully');

    // Insert super admin user
    const insertSuperAdminQuery = `
      INSERT INTO staff_users (email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = now()
      RETURNING id, email, role;
    `;

    const superAdminResult = await client.query(insertSuperAdminQuery, [
      'admin@gfarp.com',
      hashedPassword,
      'superadmin',
      'Super',
      'Admin',
      true
    ]);

    console.log('✅ Super admin created:', superAdminResult.rows[0]);

    // Insert regular admin user
    const adminResult = await client.query(insertSuperAdminQuery, [
      'admin@system.com',
      hashedPassword,
      'admin',
      'System',
      'Admin',
      true
    ]);

    console.log('✅ Regular admin created:', adminResult.rows[0]);

    // Verify users exist
    const verifyQuery = 'SELECT email, role, first_name, last_name, is_active FROM staff_users WHERE role IN ($1, $2)';
    const verifyResult = await client.query(verifyQuery, ['admin', 'superadmin']);
    
    console.log('\n📋 Admin users in database:');
    verifyResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.first_name} ${user.last_name} - Active: ${user.is_active}`);
    });

    console.log('\n🎉 Production admin users created successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('================================');
    console.log('Super Admin:');
    console.log('  Email: admin@gfarp.com');
    console.log('  Password: admin123');
    console.log('  Role: superadmin');
    console.log('');
    console.log('System Admin:');
    console.log('  Email: admin@system.com');
    console.log('  Password: admin123');
    console.log('  Role: admin');
    console.log('');
    console.log('🌐 Admin Login URL: /admin/login');
    console.log('');
    console.log('⚠️  Make sure VITE_USE_MOCK=false in your Vercel environment variables!');

  } catch (error) {
    console.error('❌ Error creating staff admin:', error);
    console.error('Error details:', error.message);
  } finally {
    await client.end();
  }
}

createStaffAdmin();