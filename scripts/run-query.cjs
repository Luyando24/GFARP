const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runQuery() {
  const queryText = process.argv[2];
  if (!queryText) {
    console.error('Usage: node scripts/run-query.cjs "SQL QUERY"');
    process.exit(1);
  }

  try {
    await client.connect();
    const result = await client.query(queryText);
    console.log('✅ Query executed successfully');
    console.log(result.rows);
  } catch (error) {
    console.error('❌ Error executing query:', error);
  } finally {
    await client.end();
  }
}

runQuery();
