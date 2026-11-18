const { Client } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

// Database configuration using DATABASE_URL like other scripts
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function fixSpecificTransfer() {
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Check for the specific transfer mentioned in the error
    const transferId = '82f87e5f-47e0-4f2e-8819-2e04ef2055f9';
    console.log(`🔍 Checking transfer ${transferId}...`);
    
    const checkResult = await client.query(
      "SELECT id, player_name, status FROM transfers WHERE id = $1",
      [transferId]
    );

    if (checkResult.rows.length === 0) {
      console.log('❌ Transfer not found - it may have been deleted');
      
      // Check all transfers to see current status
      console.log('🔍 Checking all transfers...');
      const allTransfers = await client.query(
        "SELECT id, player_name, status FROM transfers ORDER BY created_at DESC LIMIT 10"
      );
      
      console.log(`📋 Found ${allTransfers.rows.length} recent transfers:`);
      allTransfers.rows.forEach(row => {
        console.log(`  - ${row.player_name}: ${row.status} (${row.id})`);
      });
      
      return;
    }

    const transfer = checkResult.rows[0];
    console.log(`📝 Found transfer: ${transfer.player_name} with status: ${transfer.status}`);

    if (transfer.status === 'in_progress') {
      console.log('🔧 Updating status from "in_progress" to "pending"...');
      const updateResult = await client.query(
        "UPDATE transfers SET status = 'pending' WHERE id = $1",
        [transferId]
      );
      
      console.log(`✅ Updated transfer status successfully`);
    } else {
      console.log(`✅ Transfer status is already valid: ${transfer.status}`);
    }

    console.log('🎉 Transfer fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing transfer:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixSpecificTransfer();