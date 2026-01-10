import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually since it's not default for dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function initPlayerDb() {
  const { query } = await import('../server/lib/db.js');
  
  console.log('Initializing Player Database Tables...');
  
  try {
    // Create individual_players table
    console.log('Creating individual_players table...');
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
    console.log('Creating player_profiles table...');
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(player_id)
      )
    `, []);

    // Create player_purchases table
    console.log('Creating player_purchases table...');
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

    console.log('Player tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating player tables:', error);
    process.exit(1);
  }
}

initPlayerDb();
