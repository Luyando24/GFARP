import { Router } from 'express';
import { query } from '../lib/db.js';

const router = Router();

router.post('/setup-player-tables', async (req, res) => {
  try {
    // Create individual_players table
    await query(`
      CREATE TABLE IF NOT EXISTS individual_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
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
        profile_image_url VARCHAR(255),
        gallery_images TEXT[],
        height NUMERIC,
        weight NUMERIC,
        preferred_foot VARCHAR(50),
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `, []);

    // Add new columns if they don't exist (migration)
    await query(`
      ALTER TABLE player_profiles 
      ADD COLUMN IF NOT EXISTS gallery_images TEXT[],
      ADD COLUMN IF NOT EXISTS height NUMERIC,
      ADD COLUMN IF NOT EXISTS weight NUMERIC,
      ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(50)
    `, []);

    res.json({ success: true, message: 'Player tables created/updated successfully' });
  } catch (error) {
    console.error('Error creating player tables:', error);
    res.status(500).json({ error: 'Failed to create player tables' });
  }
});

export default router;
