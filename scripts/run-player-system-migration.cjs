const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envLocal = path.resolve(process.cwd(), '.env.local');
const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
}
if (!process.env.DATABASE_URL && fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

async function runPlayerSystemMigration() {
  console.log('🚀 Running player system migration (including exemptions)...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please check your .env or .env.local file.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('📦 Setting up player system tables...');
    
    // 1. Create individual_players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS individual_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Table: individual_players');

    // 2. Create player_profiles table
    await client.query(`
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
        slug VARCHAR(100) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(player_id)
      )
    `);
    console.log('✅ Table: player_profiles');

    // 3. Create player_purchases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES individual_players(id) ON DELETE CASCADE,
        plan_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        stripe_session_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Table: player_purchases');

    // 4. Create exempted_emails table (NEW)
    await client.query(`
      CREATE TABLE IF NOT EXISTS exempted_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        module VARCHAR(50) NOT NULL, -- e.g., 'individual_player_profile'
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(email, module)
      )
    `);
    console.log('✅ Table: exempted_emails');

    // 5. Run migrations for existing tables (Add missing columns)
    console.log('🛠️ Checking for missing columns...');
    
    await client.query(`
      ALTER TABLE player_profiles 
      ADD COLUMN IF NOT EXISTS gallery_images TEXT[],
      ADD COLUMN IF NOT EXISTS height NUMERIC,
      ADD COLUMN IF NOT EXISTS weight NUMERIC,
      ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(50),
      ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
      ADD COLUMN IF NOT EXISTS career_history TEXT,
      ADD COLUMN IF NOT EXISTS honours TEXT,
      ADD COLUMN IF NOT EXISTS education TEXT,
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS social_links JSONB,
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

      -- Migration: Ensure profile_image_url is TEXT to support Base64
      ALTER TABLE player_profiles 
      ALTER COLUMN profile_image_url TYPE TEXT;

      -- Add stripe_customer_id to individual_players if not exists
      ALTER TABLE individual_players 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

      -- Add stripe_session_id to player_purchases if not exists
      ALTER TABLE player_purchases 
      ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
    `);
    
    // 6. Ensure unique constraints
    console.log('🔒 Ensuring unique constraints...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'player_profiles_slug_key'
        ) THEN
          ALTER TABLE player_profiles ADD CONSTRAINT player_profiles_slug_key UNIQUE (slug);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'player_purchases_stripe_session_id_key'
        ) THEN
          ALTER TABLE player_purchases ADD CONSTRAINT player_purchases_stripe_session_id_key UNIQUE (stripe_session_id);
        END IF;
      END
      $$;
    `);

    console.log('🎉 Player system migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPlayerSystemMigration();
