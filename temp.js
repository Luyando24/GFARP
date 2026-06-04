import('pg').then(({Client}) => { 
  const client = new Client({ connectionString: 'postgresql://postgres:Pythonja@2@localhost:5432/sofwan_db' }); 
  client.connect().then(() => 
    client.query("SELECT value FROM system_settings WHERE key = 'email.smtpPass'")
      .then(res => { 
        console.log('DB RESULT:', res.rows); 
        client.end(); 
      })
  ).catch(err => { 
    console.error(err); 
    client.end(); 
  }); 
});
