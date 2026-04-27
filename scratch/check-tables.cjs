const pg = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkTables() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("Existing tables:");
    res.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    const requiredTables = [
      'notifications', 
      'user_notifications', 
      'fifa_compliance', 
      'fifa_compliance_documents'
    ];
    
    console.log("\nChecking for required tables:");
    const existingTableNames = res.rows.map(r => r.table_name);
    
    requiredTables.forEach(table => {
      const exists = existingTableNames.includes(table);
      console.log(`${table}: ${exists ? "✅ Exists" : "❌ Missing"}`);
    });

  } catch (error) {
    console.error("Error checking tables:", error);
  } finally {
    await pool.end();
  }
}

checkTables();
