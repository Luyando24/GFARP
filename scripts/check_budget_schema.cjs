const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'budget_categories'
      ORDER BY column_name;
    `);

    console.log('Columns in budget_categories table:');
    res.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type}) - Nullable: ${row.is_nullable}`);
    });

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
