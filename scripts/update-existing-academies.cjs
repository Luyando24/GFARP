const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// Database configuration using DATABASE_URL like other scripts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateExistingAcademies() {
  const client = await pool.connect();
  
  try {
    console.log('Checking existing academies for password_hash...');
    
    // Check for academies without password_hash
    const result = await client.query(`
      SELECT id, name, email 
      FROM academies 
      WHERE password_hash IS NULL OR password_hash = ''
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ All academies already have password_hash set');
      return;
    }
    
    console.log(`Found ${result.rows.length} academies without password_hash:`);
    result.rows.forEach(academy => {
      console.log(`  - ${academy.name} (${academy.email || 'no email'})`);
    });
    
    // For demo purposes, set a default password for academies without one
    // In production, you might want to send password reset emails instead
    const defaultPassword = 'academy123'; // This should be changed by academies
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    console.log('\\nUpdating academies with default password...');
    console.log('⚠️  Default password: academy123 (academies should change this)');
    
    for (const academy of result.rows) {
      await client.query(`
        UPDATE academies 
        SET password_hash = $1, updated_at = now()
        WHERE id = $2
      `, [hashedPassword, academy.id]);
      
      console.log(`✅ Updated ${academy.name}`);
    }
    
    console.log('\\n✅ All academies now have password_hash set');
    console.log('📧 Consider sending password reset emails to academies');
    
  } catch (error) {
    console.error('❌ Error updating academies:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateExistingAcademies()
  .then(() => {
    console.log('Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });