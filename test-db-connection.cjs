const { Client } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Testing database connection...');
    await client.connect();
    console.log('✅ Database connection successful');

    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query test successful:', result.rows[0]);

    // Test if players table exists and has academy_id column
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'players' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Players table columns:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Test if we can query players table
    const playersTest = await client.query('SELECT COUNT(*) as player_count FROM players');
    console.log('✅ Players table query successful. Count:', playersTest.rows[0].player_count);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

testDatabaseConnection();