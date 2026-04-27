import { query } from '../server/lib/db.js';

async function checkFK() {
  try {
    console.log('Checking foreign keys referencing subscription_plans...');
    const res = await query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'subscription_plans';
    `);
    console.log('Foreign keys found:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  }
}

checkFK();
