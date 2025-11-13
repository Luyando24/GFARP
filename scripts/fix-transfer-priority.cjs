const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixTransferPriority() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check for transfers with invalid priority
    const checkResult = await client.query(
      "SELECT id, priority FROM transfers WHERE priority NOT IN ('low', 'medium', 'high')"
    );

    console.log(`Found ${checkResult.rows.length} transfers with invalid priority`);

    if (checkResult.rows.length > 0) {
      console.log('Invalid transfers:', checkResult.rows);

      // Update invalid priority to 'high' (closest to 'urgent')
      const updateResult = await client.query(
        "UPDATE transfers SET priority = 'high' WHERE priority NOT IN ('low', 'medium', 'high')"
      );

      console.log(`Updated ${updateResult.rowCount} transfer records`);
    } else {
      console.log('No transfers with invalid priority found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

fixTransferPriority();