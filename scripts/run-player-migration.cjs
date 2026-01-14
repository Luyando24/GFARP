const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env first, then fallback to .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
}

async function runPlayerMigration() {
  console.log('🚀 Running player contact info migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please check your .env or .env.local file.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Ensure player_profiles table exists first (sanity check)
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'player_profiles'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ player_profiles table does not exist. Creating it...');
      // If it doesn't exist, we might as well create it with all columns
      await client.query(`
        CREATE TABLE IF NOT EXISTS individual_players (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS player_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_id UUID REFERENCES individual_players(id) ON DELETE CASCADE,
          display_name VARCHAR(200),
          age INTEGER,
          nationality VARCHAR(100),
          position VARCHAR(100),
          current_club VARCHAR(200),
          video_links TEXT[],
          transfermarket_link VARCHAR(255),
          bio TEXT,
          profile_image_url TEXT,
          gallery_images TEXT[],
          height NUMERIC,
          weight NUMERIC,
          preferred_foot VARCHAR(50),
          cover_image_url TEXT,
          career_history TEXT,
          honours TEXT,
          education TEXT,
          contact_email VARCHAR(255),
          whatsapp_number VARCHAR(50),
          social_links JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(player_id)
        );
      `);
      console.log('✅ Created player_profiles table with all columns.');
    } else {
      console.log('ℹ️ player_profiles table exists. Adding missing columns...');
      
      const columnsToAdd = [
        'ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)',
        'ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50)',
        'ADD COLUMN IF NOT EXISTS social_links JSONB'
      ];

      for (const col of columnsToAdd) {
        await client.query(`ALTER TABLE player_profiles ${col}`);
        console.log(`✅ Executed: ALTER TABLE player_profiles ${col}`);
      }
    }

    console.log('🎉 Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPlayerMigration();
