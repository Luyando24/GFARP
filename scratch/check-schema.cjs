require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https', 'postgres').replace('.supabase.co', '.supabase.com'),
    // Wait, the connection string in .env.local might be different.
    // Let's just use the one from the environment if available.
  });

  // Actually, I'll use the same logic as the server if possible.
  // But I don't have easy access to the server's db config without reading many files.
  // Let's just try to get it from process.env.DATABASE_URL.
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    return;
  }

  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    console.log('Checking fifa_compliance columns:');
    const compCols = await dbClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fifa_compliance'
    `);
    console.table(compCols.rows);

    console.log('\nChecking fifa_compliance_documents columns:');
    const docCols = await dbClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fifa_compliance_documents'
    `);
    console.table(docCols.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkSchema();
