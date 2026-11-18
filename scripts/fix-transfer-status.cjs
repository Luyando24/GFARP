const { Client } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

// Database configuration using DATABASE_URL like other scripts
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function fixTransferStatus() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // First, check if there are any transfers with invalid status
    console.log('🔍 Checking for transfers with invalid status...');
    const checkResult = await client.query(
      "SELECT id, player_name, status FROM transfers WHERE status NOT IN ('pending', 'approved', 'completed', 'rejected', 'cancelled')"
    );

    if (checkResult.rows.length === 0) {
      console.log('✅ No transfers with invalid status found');
      return;
    }

    console.log(`📝 Found ${checkResult.rows.length} transfers with invalid status:`);
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.player_name}: ${row.status}`);
    });

    // Update invalid status to 'pending'
    console.log('🔧 Updating invalid status to "pending"...');
    const updateResult = await client.query(
      "UPDATE transfers SET status = 'pending' WHERE status NOT IN ('pending', 'approved', 'completed', 'rejected', 'cancelled')"
    );

    console.log(`✅ Updated ${updateResult.rowCount} transfer records`);
    console.log('🎉 Transfer status fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing transfer status:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixTransferStatus();