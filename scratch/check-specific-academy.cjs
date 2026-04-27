const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAcademy() {
  const connectionString = process.env.DATABASE_URL;
  const dbClient = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await dbClient.connect();

  const id = '71d7fa29-e4df-4e55-95cb-b2da2efe276a';
  try {
    const res = await dbClient.query('SELECT * FROM academies WHERE id = $1', [id]);
    console.log('Academy found:', res.rows.length > 0);
    if (res.rows.length > 0) {
      console.log('Academy name:', res.rows[0].name);
    }

    const comp = await dbClient.query('SELECT * FROM fifa_compliance WHERE academy_id = $1', [id]);
    console.log('Compliance records:', comp.rows.length);
    if (comp.rows.length > 0) {
      console.log('Compliance ID:', comp.rows[0].id);
      
      const docs = await dbClient.query('SELECT * FROM fifa_compliance_documents WHERE compliance_id = $1', [comp.rows[0].id]);
      console.log('Document records:', docs.rows.length);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await dbClient.end();
  }
}

checkAcademy();
