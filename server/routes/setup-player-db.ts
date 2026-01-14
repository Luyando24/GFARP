import { Router } from 'express';
import { query } from '../lib/db.js';

const router = Router();

const setupTables = async (req: any, res: any) => {
  try {
    // Create individual_players table
    await query(`
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
    `, []);

    // Create player_profiles table
    await query(`
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
    `, []);

    // Create player_purchases table
    await query(`
      CREATE TABLE IF NOT EXISTS player_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES individual_players(id) ON DELETE CASCADE,
        plan_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        stripe_session_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `, []);

    // Add new columns if they don't exist (migration)
    await query(`
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

      -- Ensure unique constraint on slug
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'player_profiles_slug_key'
        ) THEN
          ALTER TABLE player_profiles ADD CONSTRAINT player_profiles_slug_key UNIQUE (slug);
        END IF;
      END
      $$;

      -- Add stripe_customer_id to individual_players if not exists
      ALTER TABLE individual_players 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

      -- Add stripe_session_id to player_purchases if not exists
      ALTER TABLE player_purchases 
      ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
      
      -- Add unique constraint to stripe_session_id if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'player_purchases_stripe_session_id_key'
        ) THEN
          ALTER TABLE player_purchases ADD CONSTRAINT player_purchases_stripe_session_id_key UNIQUE (stripe_session_id);
        END IF;
      END
      $$;
    `, []);

    res.json({ success: true, message: 'Player tables created/updated successfully' });
  } catch (error) {
    console.error('Error creating player tables:', error);
    res.status(500).json({ error: 'Failed to create player tables' });
  }
};

router.post('/setup-player-tables', setupTables);
router.get('/setup-player-tables', setupTables);

export default router;
