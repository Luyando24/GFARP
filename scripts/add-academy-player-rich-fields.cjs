const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
}

async function runMigration() {
  console.log('🚀 Running academy player rich fields migration...');
  
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

    // Add columns to players table
    await client.query(`
      ALTER TABLE players 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS career_history TEXT,
      ADD COLUMN IF NOT EXISTS honours TEXT,
      ADD COLUMN IF NOT EXISTS education TEXT,
      ADD COLUMN IF NOT EXISTS video_links TEXT[],
      ADD COLUMN IF NOT EXISTS transfermarket_link VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gallery_images TEXT[],
      ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS social_links JSONB,
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    `);
    console.log('✅ Added rich profile columns to players table');

    // Add unique constraint on slug
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'players_slug_key'
        ) THEN
          ALTER TABLE players ADD CONSTRAINT players_slug_key UNIQUE (slug);
        END IF;
      END
      $$;
    `);
    console.log('✅ Added unique constraint on slug to players table');

    console.log('🎉 Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
