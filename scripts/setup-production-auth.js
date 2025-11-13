import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin operations
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Use service role key if available, otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

// Password hashing utility
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Generate secure random password
function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function setupProductionAuth() {
  try {
    console.log('🚀 Setting up production authentication system...');
    console.log('');

    // Step 1: Create Admin table if it doesn't exist
    console.log('📋 Step 1: Ensuring Admin table exists...');
    
    // Check if Admin table exists by trying to select from it
    const { data: existingAdmins, error: tableError } = await supabase
      .from('Admin')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('⚠️ Admin table does not exist. Creating it...');
      
      // Create Admin table using SQL
      const { error: createTableError } = await supabase.rpc('create_admin_table', {});
      
      if (createTableError) {
        console.log('ℹ️ Could not create table via RPC. You may need to create it manually in Supabase dashboard.');
        console.log('📝 SQL to create Admin table:');
        console.log(`
CREATE TABLE IF NOT EXISTS "Admin" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_email ON "Admin"(email);
CREATE INDEX IF NOT EXISTS idx_admin_role ON "Admin"(role);
CREATE INDEX IF NOT EXISTS idx_admin_active ON "Admin"(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all admin records" ON "Admin"
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert admin records" ON "Admin"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update admin records" ON "Admin"
  FOR UPDATE USING (true);
        `);
      } else {
        console.log('✅ Admin table created successfully');
      }
    } else {
      console.log('✅ Admin table already exists');
    }

    // Step 2: Create production admin users
    console.log('');
    console.log('📋 Step 2: Creating production admin users...');
    
    const productionPassword = generateSecurePassword(16);
    const hashedPassword = await hashPassword(productionPassword);
    
    // Create super admin
    const superAdminId = uuidv4();
    const superAdminEmail = 'admin@gfarp.com';
    
    console.log('👤 Creating super admin user...');
    
    const { data: superAdminData, error: superAdminError } = await supabase
      .from('Admin')
      .upsert([
        {
          id: superAdminId,
          email: superAdminEmail,
          password_hash: hashedPassword,
          role: 'SUPERADMIN',
          first_name: 'System',
          last_name: 'Administrator',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select();

    if (superAdminError) {
      console.log('⚠️ Super admin creation result:', superAdminError.message);
    } else {
      console.log('✅ Super admin created/updated successfully');
    }

    // Step 3: Update environment configuration
    console.log('');
    console.log('📋 Step 3: Production configuration recommendations...');
    
    console.log('🔧 Environment Variables to Set:');
    console.log('- VITE_USE_MOCK=false (disable mock authentication)');
    console.log('- VITE_API_BASE_URL=https://your-api-domain.com/api');
    console.log('- Add SUPABASE_SERVICE_ROLE_KEY for admin operations');
    console.log('');

    // Step 4: Security recommendations
    console.log('📋 Step 4: Security recommendations...');
    console.log('🔒 Security Checklist:');
    console.log('✓ Enable Row Level Security (RLS) on all tables');
    console.log('✓ Set up proper authentication policies');
    console.log('✓ Use environment variables for sensitive data');
    console.log('✓ Enable HTTPS in production');
    console.log('✓ Set up proper CORS policies');
    console.log('✓ Implement rate limiting');
    console.log('✓ Enable audit logging');
    console.log('');

    // Step 5: Display credentials
    console.log('🎉 Production authentication setup completed!');
    console.log('');
    console.log('📋 PRODUCTION ADMIN CREDENTIALS:');
    console.log('================================');
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Password: ${productionPassword}`);
    console.log(`Role: SUPERADMIN`);
    console.log('');
    console.log('⚠️ IMPORTANT SECURITY NOTES:');
    console.log('1. Store these credentials securely');
    console.log('2. Change the password after first login');
    console.log('3. Enable 2FA if available');
    console.log('4. Set VITE_USE_MOCK=false in production');
    console.log('5. Use HTTPS in production');
    console.log('');
    console.log('🌐 Admin Login URL: /admin/login');

  } catch (error) {
    console.error('❌ Error setting up production authentication:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('1. Ensure Supabase project is accessible');
    console.log('2. Check environment variables are correct');
    console.log('3. Verify Supabase service role key permissions');
    console.log('4. Create Admin table manually if needed');
    process.exit(1);
  }
}

// Run the setup
setupProductionAuth();