const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
}

async function runSlugMigration() {
  console.log('🚀 Running player slug migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Add slug column
    await client.query(`
      ALTER TABLE player_profiles 
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
    `);
    console.log('✅ Added slug column');

    // Add unique constraint
    // We first check if there are any duplicates (unlikely if it's new and null)
    // But we need to make it unique. 
    // If existing rows have null, unique constraint allows multiple nulls in Postgres? 
    // Yes, Postgres treats nulls as distinct for unique constraints.
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'player_profiles_slug_key'
        ) THEN
          ALTER TABLE player_profiles ADD CONSTRAINT player_profiles_slug_key UNIQUE (slug);
        END IF;
      END
      $$;
    `);
    console.log('✅ Added unique constraint on slug');

    console.log('🎉 Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSlugMigration();
