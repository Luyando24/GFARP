import { query } from "../server/lib/db";

async function checkTables() {
  try {
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("Existing tables:");
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    const requiredTables = [
      'notifications', 
      'user_notifications', 
      'fifa_compliance', 
      'fifa_compliance_documents'
    ];
    
    console.log("\nChecking for required tables:");
    const existingTableNames = tablesResult.rows.map(r => r.table_name);
    
    requiredTables.forEach(table => {
      const exists = existingTableNames.includes(table);
      console.log(`${table}: ${exists ? "✅ Exists" : "❌ Missing"}`);
    });

  } catch (error) {
    console.error("Error checking tables:", error);
  }
}

checkTables();
