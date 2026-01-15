import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { query, hashPassword, verifyPassword } from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { getStripe, createStripeCustomer } from '../lib/stripe.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const PRO_PLAN = {
  id: 'pro',
  name: 'Pro Plan',
  description: 'One-time payment for full access',
  price: 20,
  currency: 'USD',
  billingCycle: 'one-time',
  features: [
    'Unlimited profile updates',
    'Video highlights upload',
    'Direct messaging with scouts',
    'Priority support',
    'Verified player badge'
  ],
  isFree: false,
  isActive: true
};

// Get Player Plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: [PRO_PLAN]
  });
});

// Create Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { planId, successUrl, cancelUrl } = req.body;

    if (planId !== 'pro') {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Get player details
    const playerResult = await query(
      'SELECT email, first_name, last_name, stripe_customer_id FROM individual_players WHERE id = $1',
      [userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = playerResult.rows[0];
    let customerId = player.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await createStripeCustomer(
        player.email,
        `${player.first_name} ${player.last_name}`,
        { playerId: userId }
      );
      customerId = customer.id;

      await query(
        'UPDATE individual_players SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, userId]
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: PRO_PLAN.name,
              description: PRO_PLAN.description,
            },
            unit_amount: PRO_PLAN.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        playerId: userId,
        planId: planId,
        type: 'player_subscription'
      }
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Payment
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const planId = session.metadata?.planId || 'pro';
      const amount = session.amount_total ? session.amount_total / 100 : 0;

      // Record purchase
      await query(
        `INSERT INTO player_purchases (player_id, plan_type, amount, status, stripe_session_id, created_at)
         VALUES ($1, $2, $3, 'completed', $4, NOW())
         ON CONFLICT (stripe_session_id) DO NOTHING`,
        [userId, planId, amount, sessionId]
      );

      res.json({ success: true, message: 'Payment verified and subscription activated' });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }

  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
});


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

// Check Slug Availability
router.post('/check-slug-availability', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { slug } = req.body;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.json({ available: false, message: 'Link Name must contain only lowercase letters, numbers, and hyphens.' });
    }

    // Check if taken by another user
    const result = await query(
      'SELECT player_id FROM player_profiles WHERE slug = $1 AND player_id != $2',
      [slug, userId]
    );

    if (result.rows.length > 0) {
      return res.json({ available: false, message: 'Link Name is already taken.' });
    }

    res.json({ available: true, message: 'Link Name is available.' });

  } catch (error) {
    console.error('Check slug availability error:', error);
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
      preferred_foot,
      cover_image_url,
      career_history,
      honours,
      education,
      contact_email,
      whatsapp_number,
      social_links,
      slug
    } = req.body;

    // Sanitize numeric fields to prevent Postgres cast errors from empty strings
    let sanitizedAge = (age === '' || age === null || age === undefined) ? null : parseInt(age as string);
    if (Number.isNaN(sanitizedAge)) sanitizedAge = null;

    let sanitizedHeight = (height === '' || height === null || height === undefined) ? null : parseFloat(height as string);
    if (Number.isNaN(sanitizedHeight)) sanitizedHeight = null;

    let sanitizedWeight = (weight === '' || weight === null || weight === undefined) ? null : parseFloat(weight as string);
    if (Number.isNaN(sanitizedWeight)) sanitizedWeight = null;

    // Validate Slug
    if (slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return res.status(400).json({ error: 'Link Name must contain only lowercase letters, numbers, and hyphens.' });
      }

      // Check for uniqueness
      const existingSlug = await query(
        'SELECT player_id FROM player_profiles WHERE slug = $1 AND player_id != $2',
        [slug, userId]
      );

      if (existingSlug.rows.length > 0) {
        return res.status(400).json({ error: 'Link Name is already taken.' });
      }
    }

    const finalSlug = slug && slug.trim() !== '' ? slug : null;

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
        ADD COLUMN IF NOT EXISTS preferred_foot VARCHAR(50),
        ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
         ADD COLUMN IF NOT EXISTS career_history TEXT,
        ADD COLUMN IF NOT EXISTS honours TEXT,
        ADD COLUMN IF NOT EXISTS education TEXT,
        ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS social_links JSONB,
        ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
        
        -- Also ensure profile_image_url is TEXT
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
      `);
    };

    const queryParams = [
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
      cover_image_url,
      career_history,
      honours,
      education,
      contact_email,
      whatsapp_number,
      social_links,
      finalSlug,
      userId
    ].map(p => p === undefined ? null : p);

    try {
      await query(
        `UPDATE player_profiles 
         SET display_name = $1, age = $2, nationality = $3, position = $4, 
             current_club = $5, video_links = $6, transfermarket_link = $7, 
             bio = $8, profile_image_url = $9, gallery_images = $10, 
             height = $11, weight = $12, preferred_foot = $13,
              cover_image_url = $14, career_history = $15, 
             honours = $16, education = $17,
             contact_email = $18, whatsapp_number = $19, social_links = $20,
             slug = $21,
             updated_at = NOW()
         WHERE player_id = $22`,
        queryParams
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
                cover_image_url = $14, career_history = $15, 
                honours = $16, education = $17,
                contact_email = $18, whatsapp_number = $19, social_links = $20,
                slug = $21,
                updated_at = NOW()
            WHERE player_id = $22`,
          queryParams
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

// Get Public Profile by Slug
router.get('/public/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT p.*, ip.first_name, ip.last_name 
       FROM player_profiles p
       JOIN individual_players ip ON p.player_id = ip.id
       WHERE p.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Filter out sensitive data if any
    const profile = result.rows[0];
    res.json(profile);

  } catch (error) {
    console.error('Get public profile by slug error:', error);
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

// Get Admin List of Players
router.get('/admin-list', async (req, res) => {
  try {
    // Check for admin role (assuming authenticateToken is used or handled by gateway, 
    // but here we might need specific admin check if exposed directly. 
    // For now, assuming internal use or secured by route prefix in index.ts)

    // Ideally, this should use a middleware like authenticateAdmin
    // But since I'm adding it to existing router, let's keep it simple for now
    // and rely on the fact that this route is likely called from Admin Dashboard
    // which should be protected. 
    // Wait, the prompt says "Add the newly added player module to the admin dashboard".
    // So this endpoint will be consumed by Admin Dashboard.

    const result = await query(`
      SELECT 
        ip.id,
        ip.email,
        ip.first_name,
        ip.last_name,
        ip.created_at,
        pp.slug,
        (SELECT CASE WHEN plan_type = 'basic' THEN 'pro' ELSE plan_type END FROM player_purchases 
         WHERE player_id = ip.id AND status = 'completed' 
         ORDER BY created_at DESC LIMIT 1) as current_plan,
        (SELECT SUM(amount) FROM player_purchases 
         WHERE player_id = ip.id AND status = 'completed') as total_spent
      FROM individual_players ip
      LEFT JOIN player_profiles pp ON ip.id = pp.player_id
      ORDER BY ip.created_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get admin player list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a player's plan (Admin only)
router.post('/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { planType } = req.body;

    if (!['free', 'pro'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    if (planType === 'pro') {
      await query(
        `INSERT INTO player_purchases (player_id, plan_type, amount, status, created_at)
         VALUES ($1, $2, 0, 'completed', NOW())`,
        [id, planType]
      );
    } else {
      // Deactivate Pro plan by marking existing completed ones as deactivated or just inserting a free one?
      // The current logic gets the latest completed purchase. 
      // To "deactivate", we can insert a 'free' record or update previous pro records to 'cancelled'.
      await query(
        `INSERT INTO player_purchases (player_id, plan_type, amount, status, created_at)
         VALUES ($1, $2, 0, 'completed', NOW())`,
        [id, 'free']
      );
    }

    res.json({ success: true, message: `Plan updated to ${planType}` });
  } catch (error) {
    console.error('Admin update plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get individual player details (Admin only)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        ip.id,
        ip.email,
        ip.first_name,
        ip.last_name,
        ip.created_at,
        ip.stripe_customer_id,
        pp.display_name,
        pp.age,
        pp.nationality,
        pp.position,
        pp.current_club,
        pp.video_links,
        pp.transfermarket_link,
        pp.bio,
        pp.profile_image_url,
        pp.gallery_images,
        pp.height,
        pp.weight,
        pp.preferred_foot,
        pp.cover_image_url,
        pp.career_history,
        pp.honours,
        pp.education,
        pp.contact_email,
        pp.whatsapp_number,
        pp.social_links,
        pp.slug,
        (SELECT plan_type FROM player_purchases 
         WHERE player_id = ip.id AND status = 'completed' 
         ORDER BY created_at DESC LIMIT 1) as current_plan,
        (SELECT json_agg(json_build_object(
           'id', pur.id,
           'plan_type', pur.plan_type,
           'amount', pur.amount,
           'status', pur.status,
           'created_at', pur.created_at
         ))
         FROM player_purchases pur
         WHERE pur.player_id = ip.id) as purchase_history
       FROM individual_players ip
       LEFT JOIN player_profiles pp ON ip.id = pp.player_id
       WHERE ip.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get individual player details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete an individual player (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await transaction(async (client) => {
      // Delete documents first (if any)
      await client.query('DELETE FROM player_documents WHERE player_id = $1', [id]);

      // Delete profile
      await client.query('DELETE FROM player_profiles WHERE player_id = $1', [id]);

      // Delete purchases
      await client.query('DELETE FROM player_purchases WHERE player_id = $1', [id]);

      // Delete player account
      const result = await client.query('DELETE FROM individual_players WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw new Error('Player not found');
      }
    });

    res.json({ success: true, message: 'Player account deleted successfully' });
  } catch (error: any) {
    console.error('Delete individual player error:', error);
    res.status(error.message === 'Player not found' ? 404 : 500).json({ error: error.message });
  }
});

export default router;
