const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function searchEverywhere() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  const id = '71d7fa29-e4df-4e55-95cb-b2da2efe276a';
  try {
    const res = await dbClient.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'uuid'
    `);

    for (const row of res.rows) {
      const tableName = row.table_name;
      const columnName = row.column_name;
      try {
        const queryText = 'SELECT 1 FROM "' + tableName + '" WHERE "' + columnName + '" = $1 LIMIT 1';
        const found = await dbClient.query(queryText, [id]);
        if (found.rows.length > 0) {
          console.log('Found in ' + tableName + '.' + columnName);
        }
      } catch (e) {
        // ignore errors for tables that might not be accessible
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

searchEverywhere();
