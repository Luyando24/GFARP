import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Password hashing utility
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function createAdminUsers() {
  try {
    console.log('🚀 Creating admin users via Supabase REST API...');
    
    // Hash the password
    const hashedPassword = await hashPassword('admin123');
    
    // Create super admin user
    const superAdminId = uuidv4();
    console.log('📝 Creating super admin user...');
    
    const { data: superAdminData, error: superAdminError } = await supabase
      .from('Admin')
      .insert([
        {
          id: superAdminId,
          email: 'admin@system.com',
          password_hash: hashedPassword,
          role: 'SUPERADMIN',
          first_name: 'System',
          last_name: 'Administrator',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (superAdminError) {
      if (superAdminError.code === '23505') {
        console.log('ℹ️ Super admin user already exists');
      } else {
        console.error('❌ Error creating super admin:', superAdminError);
      }
    } else {
      console.log('✅ Super admin created successfully');
    }

    // Create regular admin user
    const adminId = uuidv4();
    console.log('📝 Creating regular admin user...');
    
    const { data: adminData, error: adminError } = await supabase
      .from('Admin')
      .insert([
        {
          id: adminId,
          email: 'admin@gfarp.com',
          password_hash: hashedPassword,
          role: 'ADMIN',
          first_name: 'Admin',
          last_name: 'User',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (adminError) {
      if (adminError.code === '23505') {
        console.log('ℹ️ Regular admin user already exists');
      } else {
        console.error('❌ Error creating regular admin:', adminError);
      }
    } else {
      console.log('✅ Regular admin created successfully');
    }

    console.log('🎉 Admin user creation process completed!');
    console.log('');
    console.log('📋 Login credentials:');
    console.log('Super Admin:');
    console.log('  Email: admin@system.com');
    console.log('  Password: admin123');
    console.log('  Role: SUPERADMIN');
    console.log('');
    console.log('Regular Admin:');
    console.log('  Email: admin@gfarp.com');
    console.log('  Password: admin123');
    console.log('  Role: ADMIN');
    console.log('');
    console.log('🌐 Admin Login URL: /admin/login');

  } catch (error) {
    console.error('❌ Error creating admin users:', error.message);
    process.exit(1);
  }
}

// Run the function
createAdminUsers();