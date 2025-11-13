const { Client } = require('pg');
require('dotenv').config();

async function createAdminTable() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sofwan_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Pythonja@2'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to local PostgreSQL database');

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
    const adminResult = await client.query(insertSuperAdminQuery, [
      'admin@system.com',
      'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // SHA-256 hash of 'admin123'
      'ADMIN',
      'System',
      'Admin'
    ]);

    console.log('✅ Regular admin created:', adminResult.rows[0]);

    // Verify users exist
    const verifyQuery = 'SELECT email, role, first_name, last_name, is_active FROM "Admin" ORDER BY role DESC';
    const verifyResult = await client.query(verifyQuery);
    
    console.log('\n📋 Admin users in database:');
    verifyResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.first_name} ${user.last_name} - Active: ${user.is_active}`);
    });

    console.log('\n🎉 Admin table setup completed successfully!');
    console.log('\n📝 You can now login with:');
    console.log('   Super Admin: admin@gfarp.com / admin123');
    console.log('   Regular Admin: admin@system.com / admin123');

  } catch (error) {
    console.error('❌ Error creating admin table:', error);
  } finally {
    await client.end();
  }
}

createAdminTable();