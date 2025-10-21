// Manual admin creation for development/testing
// This creates admin entries that work with the mock authentication system

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock admin data that matches the authentication system
const adminUsers = [
  {
    id: 'super-admin-001',
    email: 'admin@system.com',
    password: 'admin123', // This matches the hardcoded mock auth
    role: 'SUPERADMIN',
    first_name: 'System',
    last_name: 'Administrator',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'admin-001',
    email: 'admin@gfarp.com',
    password: 'admin123',
    role: 'ADMIN',
    first_name: 'Admin',
    last_name: 'User',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function createMockAdminData() {
  try {
    console.log('🚀 Creating mock admin data for development...');
    
    // Create a JSON file with admin data for reference
    const adminDataPath = path.join(__dirname, '..', 'mock-admin-data.json');
    fs.writeFileSync(adminDataPath, JSON.stringify(adminUsers, null, 2));
    
    console.log('✅ Mock admin data created successfully!');
    console.log(`📁 Data saved to: ${adminDataPath}`);
    console.log('');
    console.log('📋 Available admin accounts:');
    
    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.role}:`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log(`   Role: ${admin.role}`);
      console.log('');
    });
    
    console.log('🌐 Admin Login URL: /admin/login');
    console.log('');
    console.log('ℹ️ Note: These credentials work with the mock authentication system.');
    console.log('ℹ️ For production, you should set up proper database authentication.');
    
  } catch (error) {
    console.error('❌ Error creating mock admin data:', error.message);
    process.exit(1);
  }
}

// Run the function
createMockAdminData();