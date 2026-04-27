import { query } from '../server/lib/db.js';

async function test() {
  try {
    console.log('Testing connection...');
    const res = await query('SELECT NOW()');
    console.log('Success:', res.rows[0]);
    
    console.log('Testing academies query...');
    const acc = await query('SELECT COUNT(*) FROM academies');
    console.log('Academies:', acc.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
