import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { query, hashPassword, verifyPassword } from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register a new individual player
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM individual_players WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(password);
    const playerId = uuidv4();

    // Create player account
    await query(
      `INSERT INTO individual_players (id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [playerId, email, hashedPassword, firstName, lastName]
    );

    // Create empty profile
    await query(
      `INSERT INTO player_profiles (player_id) VALUES ($1)`,
      [playerId]
    );

    // Generate token
    const token = jwt.sign(
      { id: playerId, email, name: `${firstName} ${lastName}`, role: 'individual_player' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: playerId,
        email,
        firstName,
        lastName,
        role: 'individual_player'
      }
    });

  } catch (error) {
    console.error('Player registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name FROM individual_players WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const player = result.rows[0];
    const isValid = await verifyPassword(password, player.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: player.id,
        email: player.email,
        name: `${player.first_name} ${player.last_name}`,
        role: 'individual_player'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: player.id,
        email: player.email,
        firstName: player.first_name,
        lastName: player.last_name,
        role: 'individual_player'
      }
    });

  } catch (error) {
    console.error('Player login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const result = await query(
      `SELECT p.*, ip.email, ip.first_name, ip.last_name,
       (SELECT plan_type FROM player_purchases 
        WHERE player_id = $1 AND status = 'completed' 
        ORDER BY created_at DESC LIMIT 1) as active_plan
       FROM player_profiles p
       JOIN individual_players ip ON p.player_id = ip.id
       WHERE p.player_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const {
      display_name,
      age,
      nationality,
      position,
      current_club,
      video_links,
      transfermarket_link,
      bio,
      profile_image_url,
      gallery_images,
      height,
      weight,
      preferred_foot
    } = req.body;

    // Sanitize numeric fields to prevent Postgres cast errors from empty strings
    const sanitizedAge = (age === '' || age === null || age === undefined) ? null : parseInt(age as string);
    const sanitizedHeight = (height === '' || height === null || height === undefined) ? null : parseFloat(height as string);
    const sanitizedWeight = (weight === '' || weight === null || weight === undefined) ? null : parseFloat(weight as string);

    // Ensure array fields are actually arrays (front-end might send null or empty)
    const sanitizedGallery = Array.isArray(gallery_images) ? gallery_images : [];
    const sanitizedVideos = Array.isArray(video_links) ? video_links : [];

    const runMigration = async () => {
      console.log('Running auto-migration for player_profiles...');
      await query(`
        ALTER TABLE player_profiles 
        ADD COLUMN IF NOT EXISTS gallery_images TEXT[],
        ADD COLUMN IF NOT EXISTS height NUMERIC,
        ADD COLUMN IF NOT EXISTS weight NUMERIC,
        ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(50);
        
        -- Also ensure profile_image_url is TEXT
        ALTER TABLE player_profiles 
        ALTER COLUMN profile_image_url TYPE TEXT;
      `);
    };

    try {
      await query(
        `UPDATE player_profiles 
         SET display_name = $1, age = $2, nationality = $3, position = $4, 
             current_club = $5, video_links = $6, transfermarket_link = $7, 
             bio = $8, profile_image_url = $9, gallery_images = $10, 
             height = $11, weight = $12, preferred_foot = $13,
             updated_at = NOW()
         WHERE player_id = $14`,
        [
          display_name,
          sanitizedAge,
          nationality,
          position,
          current_club,
          sanitizedVideos,
          transfermarket_link,
          bio,
          profile_image_url,
          sanitizedGallery,
          sanitizedHeight,
          sanitizedWeight,
          preferred_foot,
          userId
        ]
      );
    } catch (queryError: any) {
      // If column is missing (Postgres error 42703), run migration and retry
      if (queryError.code === '42703') {
        await runMigration();
        // Retry once
        await query(
          `UPDATE player_profiles 
           SET display_name = $1, age = $2, nationality = $3, position = $4, 
               current_club = $5, video_links = $6, transfermarket_link = $7, 
               bio = $8, profile_image_url = $9, gallery_images = $10, 
               height = $11, weight = $12, preferred_foot = $13,
               updated_at = NOW()
           WHERE player_id = $14`,
          [
            display_name,
            sanitizedAge,
            nationality,
            position,
            current_club,
            sanitizedVideos,
            transfermarket_link,
            bio,
            profile_image_url,
            sanitizedGallery,
            sanitizedHeight,
            sanitizedWeight,
            preferred_foot,
            userId
          ]
        );
      } else {
        throw queryError;
      }
    }

    res.json({ success: true, message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error', details: (error as any).message });
  }
});

// Get Public Profile
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, ip.first_name, ip.last_name 
       FROM player_profiles p
       JOIN individual_players ip ON p.player_id = ip.id
       WHERE p.player_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Filter out sensitive data if any
    const profile = result.rows[0];
    res.json(profile);

  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record Purchase (Simple implementation for now)
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { planType, amount } = req.body; // 'basic', 'pdf', 'pro'

    if (!['basic', 'pdf', 'pro'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    await query(
      `INSERT INTO player_purchases (player_id, plan_type, amount, status)
       VALUES ($1, $2, $3, 'completed')`,
      [userId, planType, amount]
    );

    res.json({ success: true, message: 'Purchase recorded successfully' });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
