const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testInsert() {
  const academyId = '25c2ebbc-38fe-4b3c-a588-06233a5eda8b'; // Using the ID we found
  
  try {
    await client.connect();
    console.log('Connected');

    const query = `
      INSERT INTO budget_categories (
        academy_id, category_name, category_type, budgeted_amount,
        period_type, fiscal_year, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `;

    const values = [
      academyId,
      'Test Category ' + Date.now(),
      'expense',
      1000,
      'monthly',
      2024
    ];

    console.log('Executing query with values:', values);
    const res = await client.query(query, values);
    console.log('Insert successful:', res.rows[0]);

  } catch (err) {
    console.error('Insert failed:', err);
  } finally {
    await client.end();
  }
}

testInsert();
