const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkNotifications() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  try {
    console.log('user_notifications columns:');
    const cols = await dbClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_notifications'
    `);
    console.table(cols.rows);

    console.log('\nnotifications columns:');
    const cols2 = await dbClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
    `);
    console.table(cols2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkNotifications();
