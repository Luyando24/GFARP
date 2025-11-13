// Academy CRUD Operations Test
// This file tests all CRUD operations for the academy management module

import fetch from 'node-fetch';
const BASE_URL = 'http://localhost:8080/api';

// Test data for academy creation
const testAcademy = {
  name: 'Test Football Academy',
  email: 'test@academy.com',
  password: 'testpassword123',
  contactPerson: 'John Doe',
  phone: '+260123456789',
  address: '123 Football Street, Sports District',
  city: 'Lusaka',
  country: 'Zambia',
  licenseNumber: 'FA-TEST-2024',
  foundedYear: 2020,
  website: 'https://testacademy.com',
  description: 'A test academy for CRUD operations validation'
};

// Test functions
async function testCreateAcademy() {
  console.log('🧪 Testing CREATE Academy...');
  try {
    const response = await fetch(`${BASE_URL}/academies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAcademy)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ CREATE Academy: SUCCESS');
      console.log('   Academy ID:', data.data.id);
      return data.data.id;
    } else {
      console.log('❌ CREATE Academy: FAILED');
      console.log('   Error:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ CREATE Academy: ERROR');
    console.log('   Error:', error.message);
    return null;
  }
}

async function testReadAcademies() {
  console.log('🧪 Testing READ Academies (List)...');
  try {
    const response = await fetch(`${BASE_URL}/academies?page=1&limit=10`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ READ Academies: SUCCESS');
      console.log('   Total academies:', data.data.academies.length);
      console.log('   Pagination:', data.data.pagination);
      return data.data.academies;
    } else {
      console.log('❌ READ Academies: FAILED');
      console.log('   Error:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ READ Academies: ERROR');
    console.log('   Error:', error.message);
    return null;
  }
}

async function testReadAcademy(academyId) {
  console.log('🧪 Testing READ Academy (Single)...');
  try {
    const response = await fetch(`${BASE_URL}/academies/${academyId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ READ Academy: SUCCESS');
      console.log('   Academy name:', data.data.name);
      return data.data;
    } else {
      console.log('❌ READ Academy: FAILED');
      console.log('   Error:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ READ Academy: ERROR');
    console.log('   Error:', error.message);
    return null;
  }
}

async function testUpdateAcademy(academyId) {
  console.log('🧪 Testing UPDATE Academy...');
  try {
    const updateData = {
      name: 'Updated Test Football Academy',
      description: 'Updated description for testing purposes',
      website: 'https://updated-testacademy.com'
    };

    const response = await fetch(`${BASE_URL}/academies/${academyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ UPDATE Academy: SUCCESS');
      console.log('   Updated name:', data.data.name);
      return data.data;
    } else {
      console.log('❌ UPDATE Academy: FAILED');
      console.log('   Error:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ UPDATE Academy: ERROR');
    console.log('   Error:', error.message);
    return null;
  }
}

async function testDeleteAcademy(academyId) {
  console.log('🧪 Testing DELETE Academy (Soft Delete)...');
  try {
    const response = await fetch(`${BASE_URL}/academies/${academyId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ DELETE Academy: SUCCESS');
      console.log('   Message:', data.message);
      return true;
    } else {
      console.log('❌ DELETE Academy: FAILED');
      console.log('   Error:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ DELETE Academy: ERROR');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testAcademyStats() {
  console.log('🧪 Testing Academy Statistics...');
  try {
    const response = await fetch(`${BASE_URL}/academies/stats/overview`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Academy Stats: SUCCESS');
      console.log('   Total academies:', data.data.totalAcademies);
      console.log('   Active academies:', data.data.activeAcademies);
      console.log('   Verified academies:', data.data.verifiedAcademies);
      return data.data;
    } else {
      console.log('❌ Academy Stats: FAILED');
      console.log('   Error:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Academy Stats: ERROR');
    console.log('   Error:', error.message);
    return null;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Academy CRUD Tests...\n');
  
  // Test statistics first
  await testAcademyStats();
  console.log('');
  
  // Test READ operations
  await testReadAcademies();
  console.log('');
  
  // Test CREATE operation
  const academyId = await testCreateAcademy();
  console.log('');
  
  if (academyId) {
    // Test READ single academy
    await testReadAcademy(academyId);
    console.log('');
    
    // Test UPDATE operation
    await testUpdateAcademy(academyId);
    console.log('');
    
    // Test DELETE operation
    await testDeleteAcademy(academyId);
    console.log('');
  }
  
  console.log('🏁 Academy CRUD Tests Completed!');
}

// Run tests immediately in Node.js environment
runAllTests().catch(console.error);