const { Client } = require('pg');
require('dotenv').config();

async function createAdminTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to Supabase database');

    // Create Admin table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "Admin" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPERADMIN')),
        first_name TEXT,
        last_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await client.query(createTableQuery);
    console.log('✅ Admin table created successfully');

    // Insert super admin user
    const insertSuperAdminQuery = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = now()
      RETURNING id, email, role;
    `;

    const superAdminResult = await client.query(insertSuperAdminQuery, [
      'admin@gfarp.com',
      'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // SHA-256 hash of 'admin123'
      'SUPERADMIN',
      'Super',
      'Admin'
    ]);

    console.log('✅ Super admin created:', superAdminResult.rows[0]);

    // Insert regular admin user
    const insertAdminQuery = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = now()
      RETURNING id, email, role;
    `;

    const adminResult = await client.query(insertAdminQuery, [
      'admin@system.com',
      'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // SHA-256 hash of 'admin123'
      'ADMIN',
      'System',
      'Admin'
    ]);

    console.log('✅ Regular admin created:', adminResult.rows[0]);

    // Verify table exists and has data
    const verifyQuery = 'SELECT COUNT(*) as count FROM "Admin"';
    const verifyResult = await client.query(verifyQuery);
    console.log(`✅ Admin table has ${verifyResult.rows[0].count} users`);

    console.log('\n🎉 Production admin users created successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('================================');
    console.log('Super Admin:');
    console.log('  Email: admin@gfarp.com');
    console.log('  Password: admin123');
    console.log('  Role: SUPERADMIN');
    console.log('');
    console.log('System Admin:');
    console.log('  Email: admin@system.com');
    console.log('  Password: admin123');
    console.log('  Role: ADMIN');
    console.log('');
    console.log('🌐 Admin Login URL: /admin/login');

  } catch (error) {
    console.error('❌ Error creating admin table:', error);
  } finally {
    await client.end();
  }
}

createAdminTable();