// const fetch = require('node-fetch'); // Use global fetch

const BASE_URL = 'http://localhost:8080/api';
const ACADEMY_ID = '25c2ebbc-38fe-4b3c-a588-06233a5eda8b'; // Valid ID

async function testCreate(payload) {
  try {
    console.log('Testing with payload:', JSON.stringify(payload));
    const response = await fetch(`${BASE_URL}/financial-transactions/${ACADEMY_ID}/budget-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }

    console.log(`Status: ${status}`);
    console.log('Response:', data);
    console.log('-------------------');
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

async function run() {
  // 1. Valid payload
  await testCreate({
    category_name: 'Test API Budget',
    budgeted_amount: 5000,
    category_type: 'expense',
    period_type: 'monthly',
    fiscal_year: 2024
  });

  // 2. Missing name
  await testCreate({
    budgeted_amount: 5000
  });

  // 3. Missing amount
  await testCreate({
    category_name: 'Test No Amount'
  });
  
  // 4. Zero amount
  await testCreate({
    category_name: 'Test Zero Amount',
    budgeted_amount: 0
  });
}

run();
