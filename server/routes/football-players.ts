import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Auto-run migrations for players table rich fields
(async () => {
  try {
    console.log('[FootballPlayers] Ensuring rich profile columns exist in players table...');
    await query(`
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
    
    await query(`
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
    console.log('[FootballPlayers] Rich profile columns and constraints ensured successfully.');
  } catch (error) {
    console.error('[FootballPlayers] Failed to ensure rich profile columns:', error);
  }
})();

// Simple encryption function (in production, use proper encryption)
const encrypt = (text: string) => {
  if (!text) return Buffer.from('');
  return Buffer.from(text, 'utf8');
};

// Robust decryption function to handle various input types
const decrypt = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('\\x')) {
    return Buffer.from(value.slice(2), 'hex').toString('utf8');
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return Buffer.from(value as ArrayBuffer).toString('utf8');
  }
  if (typeof value === 'string') return value;
  return String(value);
};

// Create Player
export const handleCreatePlayer: RequestHandler = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      position,
      email,
      phone,
      phoneCountryCode,
      height,
      weight,
      nrc,
      guardianName,
      guardianPhone,
      address,
      medicalInfo,
      emergencyContact,
      playingHistory,
      jerseyNumber,
      preferredFoot,
      academyId,
      agencyId,
      currentClub,
      city,
      country
    } = req.body;

    // Combine phoneCountryCode and phone if both are provided
    let combinedPhone = '';
    if (phoneCountryCode && phone) {
      combinedPhone = `${phoneCountryCode}${phone}`;
    } else if (phone) {
      combinedPhone = phone;
    }

    if (!firstName || !lastName || !dateOfBirth || !position) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, dateOfBirth, position',
      });
    }

    // Check subscription limits before creating player
    const orgId = academyId || agencyId;
    if (orgId) {
      const isAgency = !!agencyId;
      const subTable = isAgency ? 'agency_subscriptions' : 'academy_subscriptions';
      const orgIdColumn = isAgency ? 'agency_id' : 'academy_id';

      // Get organization's current subscription and plan details
      const subscriptionQuery = `
        SELECT 
          sp.name as plan_name,
          sp.player_limit,
          sp.id as plan_id,
          asub.status as subscription_status
        FROM ${subTable} asub
        JOIN subscription_plans sp ON asub.plan_id = sp.id
        WHERE asub.${orgIdColumn} = $1 
          AND asub.status = 'ACTIVE'
          AND asub.end_date > NOW()
        ORDER BY asub.created_at DESC
        LIMIT 1
      `;

      const subscriptionResult = await query(subscriptionQuery, [orgId]);

      let subscription;
      // Check if there's no subscription at all
      if (subscriptionResult.rows.length === 0) {
        // Get the pro plan from the database as default
        const proPlanQuery = `
          SELECT id, name, player_limit 
          FROM subscription_plans 
          WHERE name = 'Pro' OR name = 'Pro Plan'
          LIMIT 1
        `;
        const proPlanResult = await query(proPlanQuery);

        if (proPlanResult.rows.length > 0) {
          const proPlan = proPlanResult.rows[0];
          subscription = {
            plan_name: proPlan.name,
            player_limit: proPlan.player_limit,
            plan_id: proPlan.id
          };
        } else {
          // Fallback if no pro plan is configured in the DB
          return res.status(500).json({
            success: false,
            message: 'No subscription plan configured. Please contact support.'
          });
        }

        // Check if they've already reached the pro plan limit
        let currentPlayerCount = 0;
        const playerCountQuery = `
          SELECT COUNT(*) as player_count 
          FROM players 
          WHERE ${orgIdColumn} = $1
        `;
        const playerCountResult = await query(playerCountQuery, [orgId]);
        currentPlayerCount = parseInt(playerCountResult.rows[0].player_count);

        if (subscription.player_limit !== -1 && currentPlayerCount >= subscription.player_limit) {
          return res.status(403).json({
            success: false,
            message: `Player limit reached. Your ${subscription.plan_name} allows up to ${subscription.player_limit} players. Please upgrade your subscription to add more players.`,
            data: {
              currentPlayers: currentPlayerCount,
              playerLimit: subscription.player_limit,
              planName: subscription.plan_name
            }
          });
        }

        // If they haven't reached the limit, allow them to continue
      } else {
        // Use the active subscription
        subscription = subscriptionResult.rows[0];

        // If player limit is not unlimited (-1), check current player count
        if (subscription.player_limit !== -1) {
          const playerCountQuery = `
            SELECT COUNT(*) as player_count 
            FROM players 
            WHERE ${orgIdColumn} = $1
          `;
          const playerCountResult = await query(playerCountQuery, [orgId]);
          const currentPlayerCount = parseInt(playerCountResult.rows[0].player_count);

          if (currentPlayerCount >= subscription.player_limit) {
            return res.status(403).json({
              success: false,
              message: `Player limit reached. Your ${subscription.plan_name} plan allows up to ${subscription.player_limit} players. Please upgrade your subscription to add more players.`,
              data: {
                currentPlayers: currentPlayerCount,
                playerLimit: subscription.player_limit,
                planName: subscription.plan_name
              }
            });
          }
        }
      }
    }

    const playerId = uuidv4();
    const playerCardId = Math.random().toString(36).substr(2, 6).toUpperCase(); // Exactly 6 characters
    const cardId = `CARD-${Date.now()}`;
    const cardQrSignature = `QR-${playerId}`;

    // Simple encryption simulation (in production, use proper encryption)
    const encrypt = (text: string) => Buffer.from(text || '', 'utf8');
    const nrcHash = nrc ? Buffer.from(nrc).toString('base64') : `HASH-${playerId}`;
    const nrcSalt = `SALT-${Date.now()}`;

    const insertQuery = `
      INSERT INTO players (
        id, player_card_id, nrc_hash, nrc_salt,
        first_name_cipher, last_name_cipher, email_cipher, phone_cipher,
        gender, dob_cipher, address_cipher,
        guardian_contact_name_cipher, guardian_contact_phone_cipher,
        position, preferred_foot, height_cm, weight_kg, jersey_number,
        registration_date, guardian_info_cipher, medical_info_cipher,
        playing_history_cipher, emergency_contact_cipher,
        current_club_cipher, city_cipher, country_cipher,
        card_id, card_qr_signature, academy_id, agency_id, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23,
        $24, $25, $26,
        $27, $28, $29, $30, true, NOW(), NOW()
      ) RETURNING id, player_card_id, position, height_cm, weight_kg, jersey_number, created_at, updated_at
    `;

    const values = [
      playerId,                                    // $1 - id
      playerCardId,                               // $2 - player_card_id
      nrcHash,                                    // $3 - nrc_hash
      nrcSalt,                                    // $4 - nrc_salt
      encrypt(firstName),                         // $5 - first_name_cipher
      encrypt(lastName),                          // $6 - last_name_cipher
      email ? encrypt(email) : null,              // $7 - email_cipher
      combinedPhone ? encrypt(combinedPhone) : null,              // $8 - phone_cipher
      'Unknown',                                  // $9 - gender
      encrypt(dateOfBirth),                       // $10 - dob_cipher
      address ? encrypt(address) : null,          // $11 - address_cipher
      guardianName ? encrypt(guardianName) : null, // $12 - guardian_contact_name_cipher
      guardianPhone ? encrypt(guardianPhone) : null, // $13 - guardian_contact_phone_cipher
      position,                                   // $14 - position
      preferredFoot ? preferredFoot.toLowerCase() : null,                      // $15 - preferred_foot
      height ? parseInt(height) : null,           // $16 - height_cm
      weight ? parseFloat(weight) : null,         // $17 - weight_kg
      jerseyNumber ? parseInt(jerseyNumber) : null, // $18 - jersey_number
      new Date(),                                 // $19 - registration_date
      guardianName ? encrypt(`${guardianName} - ${guardianPhone || 'No phone'}`) : null, // $20 - guardian_info_cipher
      medicalInfo ? encrypt(medicalInfo) : null,  // $21 - medical_info_cipher
      playingHistory ? encrypt(playingHistory) : null, // $22 - playing_history_cipher
      emergencyContact ? encrypt(emergencyContact) : null, // $23 - emergency_contact_cipher
      currentClub ? encrypt(currentClub) : null,  // $24 - current_club_cipher
      city ? encrypt(city) : null,                // $25 - city_cipher
      country ? encrypt(country) : null,          // $26 - country_cipher
      cardId,                                     // $27 - card_id
      cardQrSignature,                            // $28 - card_qr_signature
      academyId || null,                          // $29 - academy_id
      agencyId || null                            // $30 - agency_id
    ];

    const result = await query(insertQuery, values);
    const created = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        player: {
          id: created.id,
          playerCardId: created.player_card_id,
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: dateOfBirth,
          nationality: nationality || 'Unknown',
          position: created.position,
          email: email || null,
          phone: phone || null,
          height: created.height_cm || null,
          weight: created.weight_kg || null,
          jerseyNumber: created.jersey_number || null,
          preferredFoot: preferredFoot || null,
          isActive: true,
          createdAt: created.created_at.toISOString(),
          updatedAt: created.updated_at.toISOString(),
        },
      },
      message: 'Player created successfully',
    });
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}



// Get Academy Players
export const handleGetAcademyPlayers: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const academyId = (req.query.academyId as string) || undefined;
    const agencyId = (req.query.agencyId as string) || undefined;

    const offset = (page - 1) * limit;

    let baseQuery = '';
    let countQuery = '';
    const params: any[] = [];

    if (academyId) {
      baseQuery = `
        SELECT * FROM (
          SELECT id, player_card_id, first_name_cipher, last_name_cipher, dob_cipher, 
                 position, email_cipher, phone_cipher, jersey_number, height_cm, weight_kg,
                 preferred_foot, created_at, updated_at, false as is_self_registered
          FROM players
          WHERE academy_id = $1
          UNION ALL
          SELECT ip.id, NULL::text as player_card_id, 
                 ip.first_name::bytea as first_name_cipher, ip.last_name::bytea as last_name_cipher, 
                 ((EXTRACT(YEAR FROM NOW()) - COALESCE(pp.age, 16))::text || '-01-01')::bytea as dob_cipher,
                 pp.position, ip.email::bytea as email_cipher, pp.whatsapp_number::bytea as phone_cipher, 
                 NULL::integer as jersey_number, pp.height::integer as height_cm, pp.weight as weight_kg,
                 pp.preferred_foot, ip.created_at, ip.updated_at, true as is_self_registered
          FROM individual_players ip
          LEFT JOIN player_profiles pp ON ip.id = pp.player_id
          WHERE ip.academy_id = $1
        ) combined_players
        ORDER BY created_at DESC LIMIT $2 OFFSET $3
      `;
      params.push(academyId, limit, offset);

      countQuery = `
        SELECT (
          (SELECT COUNT(*)::int FROM players WHERE academy_id = $1) +
          (SELECT COUNT(*)::int FROM individual_players WHERE academy_id = $1)
        ) as count
      `;
    } else if (agencyId) {
      baseQuery = `
        SELECT id, player_card_id, first_name_cipher, last_name_cipher, dob_cipher, 
               position, email_cipher, phone_cipher, jersey_number, height_cm, weight_kg,
               preferred_foot, created_at, updated_at, false as is_self_registered
        FROM players
        WHERE agency_id = $1
        ORDER BY created_at DESC LIMIT $2 OFFSET $3
      `;
      params.push(agencyId, limit, offset);

      countQuery = `SELECT COUNT(*)::int as count FROM players WHERE agency_id = $1`;
    } else {
      // Security: If no ID provided, return empty list
      return res.json({
        success: true,
        data: {
          players: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
      });
    }

    const { rows } = await query(baseQuery, params);
    const countRes = await query(countQuery, [academyId || agencyId]);
    const total = countRes.rows[0]?.count || 0;

    const mapped = rows.map((p: any) => ({
      id: p.id,
      playerCardId: p.player_card_id,
      firstName: decrypt(p.first_name_cipher),
      lastName: decrypt(p.last_name_cipher),
      dateOfBirth: decrypt(p.dob_cipher),
      position: p.position,
      email: decrypt(p.email_cipher),
      phone: decrypt(p.phone_cipher),
      jerseyNumber: p.jersey_number ?? null,
      height: p.height_cm ?? null,
      weight: p.weight_kg ?? null,
      preferredFoot: p.preferred_foot ?? null,
      isActive: true,
      isSelfRegistered: p.is_self_registered,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
      updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
    }));

    res.json({
      success: true,
      data: {
        players: mapped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get academy players error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Search Players
export const handleSearchPlayers: RequestHandler = async (req, res) => {
  try {
    const query_param = req.query.q as string;
    const academyId = (req.query.academyId as string) || undefined;
    const agencyId = (req.query.agencyId as string) || undefined;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query_param || query_param.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Search in encrypted first_name and last_name fields
    // Note: This is a simplified search - in production you'd want more sophisticated search
    let searchQuery = '';
    const params: any[] = [];

    if (agencyId) {
      searchQuery = `
        SELECT id, player_card_id, first_name_cipher, last_name_cipher, 
               position, current_club_cipher, created_at, updated_at
        FROM players
        WHERE agency_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params.push(agencyId, limit);
    } else {
      searchQuery = `
        SELECT * FROM (
          SELECT id, player_card_id, first_name_cipher, last_name_cipher, 
                 position, current_club_cipher, created_at, updated_at
          FROM players
          WHERE academy_id = $1
          UNION ALL
          SELECT ip.id, NULL::text as player_card_id,
                 ip.first_name::bytea as first_name_cipher, ip.last_name::bytea as last_name_cipher,
                 pp.position, pp.current_club::bytea as current_club_cipher, ip.created_at, ip.updated_at
          FROM individual_players ip
          LEFT JOIN player_profiles pp ON ip.id = pp.player_id
          WHERE ip.academy_id = $1
        ) combined_players
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params.push(academyId, limit);
    }

    const { rows } = await query(searchQuery, params);

    // Filter results by decrypted names (client-side filtering for encrypted data)
    const searchTerm = query_param.toLowerCase();
    const filteredResults = rows
      .map((p: any) => {
        const firstName = decrypt(p.first_name_cipher) || '';
        const lastName = decrypt(p.last_name_cipher) || '';
        const currentClub = decrypt(p.current_club_cipher) || '';

        return {
          id: p.id,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          position: p.position,
          currentClub,
          createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
          updatedAt: p.updated_at ? new Date(p.updated_at).toISOString() : null,
        };
      })
      .filter((player: any) =>
        player.name.toLowerCase().includes(searchTerm) ||
        player.firstName.toLowerCase().includes(searchTerm) ||
        player.lastName.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit);

    res.json({
      success: true,
      data: filteredResults
    });
  } catch (error) {
    console.error('Search players error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get Player Details
export const handleGetPlayerDetails: RequestHandler = async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`[GetPlayerDetails] Fetching details for player: ${playerId}`);

    // Fetch player from database
    const playerQuery = `SELECT id, player_card_id, 
                                first_name_cipher, last_name_cipher, 
                                dob_cipher, position, 
                                email_cipher, phone_cipher, 
                                address_cipher, 
                                guardian_contact_name_cipher, 
                                guardian_contact_phone_cipher, 
                                guardian_contact_email_cipher, 
                                medical_info_cipher, 
                                emergency_contact_cipher, 
                                height_cm, weight_kg, preferred_foot, jersey_number,
                                guardian_info_cipher, playing_history_cipher, gender,
                                registration_date, card_id, card_qr_signature,
                                nationality, training_start_date, training_end_date,
                                emergency_phone_cipher, 
                                internal_notes_cipher, notes_cipher, 
                                current_club_cipher, city_cipher, country_cipher,
                                bio, career_history, honours, education, video_links,
                                transfermarket_link, gallery_images, cover_image_url,
                                contact_email, whatsapp_number, social_links, slug,
                                display_name, profile_image_url,
                                created_at, updated_at
                         FROM players WHERE id = $1`;
    const playerResult = await query(playerQuery, [playerId]);

    if (playerResult.rows.length === 0) {
      console.log(`[GetPlayerDetails] Player not found in players table: ${playerId}. Checking individual_players...`);
      const individualQuery = `
        SELECT ip.id, ip.first_name, ip.last_name, ip.email,
               pp.position, pp.age, pp.nationality, pp.height, pp.weight, pp.preferred_foot,
               pp.bio, pp.career_history, pp.honours, pp.education, pp.video_links,
               pp.transfermarket_link, pp.gallery_images, pp.cover_image_url,
               pp.contact_email, pp.whatsapp_number, pp.social_links, pp.slug, pp.display_name, pp.profile_image_url,
               pp.current_club, ip.created_at, ip.updated_at
        FROM individual_players ip
        LEFT JOIN player_profiles pp ON ip.id = pp.player_id
        WHERE ip.id = $1
      `;
      const individualResult = await query(individualQuery, [playerId]);
      
      if (individualResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }
      
      const p = individualResult.rows[0];
      const estimatedDob = p.age ? `${new Date().getFullYear() - p.age}-01-01` : '';
      
      return res.json({
        success: true,
        data: {
          id: p.id,
          playerCardId: null,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          dateOfBirth: estimatedDob,
          position: p.position || '',
          email: p.email || '',
          phone: p.whatsapp_number || '',
          address: '',
          gender: '',
          guardianName: '',
          guardianPhone: '',
          guardianEmail: '',
          guardianInfo: '',
          medicalInfo: '',
          emergencyContact: '',
          playingHistory: '',
          height: p.height || null,
          weight: p.weight || null,
          preferredFoot: p.preferred_foot ? p.preferred_foot.charAt(0).toUpperCase() + p.preferred_foot.slice(1) : '',
          jerseyNumber: null,
          registrationDate: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : null,
          nationality: p.nationality || '',
          trainingStartDate: null,
          trainingEndDate: null,
          emergencyPhone: '',
          internalNotes: '',
          notes: '',
          currentClub: p.current_club || '',
          city: '',
          country: '',
          cardId: '',
          cardQrSignature: '',
          bio: p.bio || '',
          career_history: p.career_history || '',
          honours: p.honours || '',
          education: p.education || '',
          video_links: p.video_links || [],
          transfermarket_link: p.transfermarket_link || '',
          gallery_images: p.gallery_images || [],
          cover_image_url: p.cover_image_url || '',
          contact_email: p.contact_email || '',
          whatsapp_number: p.whatsapp_number || '',
          social_links: p.social_links || {},
          slug: p.slug || '',
          display_name: p.display_name || '',
          profile_image_url: p.profile_image_url || '',
          isActive: true,
          isSelfRegistered: true,
          createdAt: p.created_at.toISOString(),
          updatedAt: p.updated_at.toISOString()
        }
      });
    }

    const player = playerResult.rows[0];
    console.log(`[GetPlayerDetails] Player found. Decrypting...`);

    res.json({
      success: true,
      data: {
        id: player.id,
        playerCardId: player.player_card_id,
        firstName: decrypt(player.first_name_cipher) || '',
        lastName: decrypt(player.last_name_cipher) || '',
        dateOfBirth: decrypt(player.dob_cipher) || '',
        position: player.position,
        email: decrypt(player.email_cipher) || '',
        phone: decrypt(player.phone_cipher) || '',
        address: decrypt(player.address_cipher) || '',
        gender: player.gender || '',
        guardianName: decrypt(player.guardian_contact_name_cipher) || '',
        guardianPhone: decrypt(player.guardian_contact_phone_cipher) || '',
        guardianEmail: decrypt(player.guardian_contact_email_cipher) || '',
        guardianInfo: decrypt(player.guardian_info_cipher) || '',
        medicalInfo: decrypt(player.medical_info_cipher) || '',
        emergencyContact: decrypt(player.emergency_contact_cipher) || '',
        playingHistory: decrypt(player.playing_history_cipher) || '',
        height: player.height_cm || null,
        weight: player.weight_kg || null,
        preferredFoot: player.preferred_foot ? player.preferred_foot.charAt(0).toUpperCase() + player.preferred_foot.slice(1) : '',
        jerseyNumber: player.jersey_number || null,
        registrationDate: player.registration_date ? new Date(player.registration_date).toISOString().split('T')[0] : null,
        // Add the missing fields to the response
        nationality: player.nationality || '',
        trainingStartDate: player.training_start_date ? new Date(player.training_start_date).toISOString().split('T')[0] : null,
        trainingEndDate: player.training_end_date ? new Date(player.training_end_date).toISOString().split('T')[0] : null,
        emergencyPhone: decrypt(player.emergency_phone_cipher) || '',
        internalNotes: player.internal_notes_cipher ? decrypt(player.internal_notes_cipher) : '',
        notes: decrypt(player.notes_cipher) || '',
        // Add the new contact info fields
        currentClub: player.current_club_cipher ? decrypt(player.current_club_cipher) : '',
        city: decrypt(player.city_cipher) || '',
        country: decrypt(player.country_cipher) || '',
        cardId: player.card_id || '',
        cardQrSignature: player.card_qr_signature || '',
        // Rich profile fields
        bio: player.bio || '',
        career_history: player.career_history || '',
        honours: player.honours || '',
        education: player.education || '',
        video_links: player.video_links || [],
        transfermarket_link: player.transfermarket_link || '',
        gallery_images: player.gallery_images || [],
        cover_image_url: player.cover_image_url || '',
        contact_email: player.contact_email || '',
        whatsapp_number: player.whatsapp_number || '',
        social_links: player.social_links || {},
        slug: player.slug || '',
        display_name: player.display_name || '',
        profile_image_url: player.profile_image_url || '',
        isActive: true,
        createdAt: player.created_at.toISOString(),
        updatedAt: player.updated_at.toISOString()
      }
    });

  } catch (error) {
    console.error('Get player details error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update Player
export const handleUpdatePlayer: RequestHandler = async (req, res) => {
  try {
    const { playerId } = req.params;
    const updateData = req.body;

    // Check if player exists
    const checkQuery = 'SELECT * FROM players WHERE id = $1';
    const existingResult = await query(checkQuery, [playerId]);

    if (existingResult.rows.length === 0) {
      console.log(`[UpdatePlayer] Player not found in players table: ${playerId}. Checking individual_players...`);
      // Check if it's a self-registered individual player
      const individualCheck = await query('SELECT * FROM individual_players WHERE id = $1', [playerId]);
      if (individualCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }
      
      // Update individual_players table
      const ipUpdates: string[] = [];
      const ipValues: any[] = [];
      let ipParamCount = 1;
      
      if (updateData.firstName !== undefined) {
        ipUpdates.push(`first_name = $${ipParamCount++}`);
        ipValues.push(updateData.firstName);
      }
      if (updateData.lastName !== undefined) {
        ipUpdates.push(`last_name = $${ipParamCount++}`);
        ipValues.push(updateData.lastName);
      }
      if (updateData.email !== undefined) {
        ipUpdates.push(`email = $${ipParamCount++}`);
        ipValues.push(updateData.email || '');
      }
      
      if (ipUpdates.length > 0) {
        ipValues.push(playerId);
        await query(`UPDATE individual_players SET ${ipUpdates.join(', ')}, updated_at = NOW() WHERE id = $${ipParamCount}`, ipValues);
      }
      
      // Update player_profiles table
      const ppUpdates: string[] = [];
      const ppValues: any[] = [];
      let ppParamCount = 1;
      
      if (updateData.position !== undefined) {
        ppUpdates.push(`position = $${ppParamCount++}`);
        ppValues.push(updateData.position);
      }
      if (updateData.height !== undefined) {
        ppUpdates.push(`height = $${ppParamCount++}`);
        ppValues.push(updateData.height ? parseFloat(updateData.height) : null);
      }
      if (updateData.weight !== undefined) {
        ppUpdates.push(`weight = $${ppParamCount++}`);
        ppValues.push(updateData.weight ? parseFloat(updateData.weight) : null);
      }
      if (updateData.preferredFoot !== undefined) {
        ppUpdates.push(`preferred_foot = $${ppParamCount++}`);
        ppValues.push(updateData.preferredFoot ? updateData.preferredFoot.toLowerCase() : null);
      }
      if (updateData.bio !== undefined) {
        ppUpdates.push(`bio = $${ppParamCount++}`);
        ppValues.push(updateData.bio);
      }
      if (updateData.career_history !== undefined) {
        ppUpdates.push(`career_history = $${ppParamCount++}`);
        ppValues.push(updateData.career_history);
      }
      if (updateData.honours !== undefined) {
        ppUpdates.push(`honours = $${ppParamCount++}`);
        ppValues.push(updateData.honours);
      }
      if (updateData.education !== undefined) {
        ppUpdates.push(`education = $${ppParamCount++}`);
        ppValues.push(updateData.education);
      }
      if (updateData.video_links !== undefined) {
        ppUpdates.push(`video_links = $${ppParamCount++}`);
        ppValues.push(Array.isArray(updateData.video_links) ? updateData.video_links : []);
      }
      if (updateData.transfermarket_link !== undefined) {
        ppUpdates.push(`transfermarket_link = $${ppParamCount++}`);
        ppValues.push(updateData.transfermarket_link);
      }
      if (updateData.gallery_images !== undefined) {
        ppUpdates.push(`gallery_images = $${ppParamCount++}`);
        ppValues.push(Array.isArray(updateData.gallery_images) ? updateData.gallery_images : []);
      }
      if (updateData.cover_image_url !== undefined) {
        ppUpdates.push(`cover_image_url = $${ppParamCount++}`);
        ppValues.push(updateData.cover_image_url);
      }
      if (updateData.contact_email !== undefined) {
        ppUpdates.push(`contact_email = $${ppParamCount++}`);
        ppValues.push(updateData.contact_email);
      }
      if (updateData.whatsapp_number !== undefined) {
        ppUpdates.push(`whatsapp_number = $${ppParamCount++}`);
        ppValues.push(updateData.whatsapp_number);
      }
      if (updateData.social_links !== undefined) {
        ppUpdates.push(`social_links = $${ppParamCount++}`);
        ppValues.push(typeof updateData.social_links === 'string' ? updateData.social_links : JSON.stringify(updateData.social_links || {}));
      }
      if (updateData.slug !== undefined) {
        ppUpdates.push(`slug = $${ppParamCount++}`);
        ppValues.push(updateData.slug && updateData.slug.trim() !== '' ? updateData.slug.trim() : null);
      }
      if (updateData.display_name !== undefined) {
        ppUpdates.push(`display_name = $${ppParamCount++}`);
        ppValues.push(updateData.display_name);
      }
      if (updateData.profile_image_url !== undefined) {
        ppUpdates.push(`profile_image_url = $${ppParamCount++}`);
        ppValues.push(updateData.profile_image_url);
      }
      if (updateData.nationality !== undefined) {
        ppUpdates.push(`nationality = $${ppParamCount++}`);
        ppValues.push(updateData.nationality || null);
      }
      if (updateData.currentClub !== undefined) {
        ppUpdates.push(`current_club = $${ppParamCount++}`);
        ppValues.push(updateData.currentClub || null);
      }
      if (updateData.dateOfBirth !== undefined && updateData.dateOfBirth) {
        const birthDate = new Date(updateData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        ppUpdates.push(`age = $${ppParamCount++}`);
        ppValues.push(age);
      }
      
      if (ppUpdates.length > 0) {
        ppValues.push(playerId);
        await query(`UPDATE player_profiles SET ${ppUpdates.join(', ')}, updated_at = NOW() WHERE player_id = $${ppParamCount}`, ppValues);
      }
      
      // Fetch the updated profile and return it in standard player response shape
      const updatedRes = await query(
        `SELECT ip.id, ip.first_name, ip.last_name, ip.email,
                pp.position, pp.age, pp.nationality, pp.height, pp.weight, pp.preferred_foot,
                pp.bio, pp.career_history, pp.honours, pp.education, pp.video_links,
                pp.transfermarket_link, pp.gallery_images, pp.cover_image_url,
                pp.contact_email, pp.whatsapp_number, pp.social_links, pp.slug, pp.display_name, pp.profile_image_url,
                pp.current_club, ip.created_at, ip.updated_at
         FROM individual_players ip
         LEFT JOIN player_profiles pp ON ip.id = pp.player_id
         WHERE ip.id = $1`,
        [playerId]
      );
      
      const p = updatedRes.rows[0];
      const estimatedDob = p.age ? `${new Date().getFullYear() - p.age}-01-01` : '';
      
      return res.json({
        success: true,
        message: 'Player updated successfully',
        data: {
          id: p.id,
          playerCardId: null,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          dateOfBirth: estimatedDob,
          position: p.position || '',
          email: p.email || '',
          phone: p.whatsapp_number || '',
          address: '',
          gender: '',
          guardianName: '',
          guardianPhone: '',
          guardianEmail: '',
          guardianInfo: '',
          medicalInfo: '',
          emergencyContact: '',
          playingHistory: '',
          height: p.height || null,
          weight: p.weight || null,
          preferredFoot: p.preferred_foot ? p.preferred_foot.charAt(0).toUpperCase() + p.preferred_foot.slice(1) : '',
          jerseyNumber: null,
          registrationDate: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : null,
          nationality: p.nationality || '',
          trainingStartDate: null,
          trainingEndDate: null,
          emergencyPhone: '',
          internalNotes: '',
          notes: '',
          currentClub: p.current_club || '',
          city: '',
          country: '',
          cardId: '',
          cardQrSignature: '',
          bio: p.bio || '',
          career_history: p.career_history || '',
          honours: p.honours || '',
          education: p.education || '',
          video_links: p.video_links || [],
          transfermarket_link: p.transfermarket_link || '',
          gallery_images: p.gallery_images || [],
          cover_image_url: p.cover_image_url || '',
          contact_email: p.contact_email || '',
          whatsapp_number: p.whatsapp_number || '',
          social_links: p.social_links || {},
          slug: p.slug || '',
          display_name: p.display_name || '',
          profile_image_url: p.profile_image_url || '',
          isActive: true,
          isSelfRegistered: true,
          createdAt: p.created_at.toISOString(),
          updatedAt: p.updated_at.toISOString()
        }
      });
    }

    const existing = existingResult.rows[0];

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Encrypt and update fields that require it
    if (updateData.firstName !== undefined) {
      updates.push(`first_name_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.firstName));
    }
    if (updateData.lastName !== undefined) {
      updates.push(`last_name_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.lastName));
    }
    if (updateData.dateOfBirth !== undefined) {
      updates.push(`dob_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.dateOfBirth));
    }
    if (updateData.email !== undefined) {
      updates.push(`email_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.email || ''));
    }
    if (updateData.phone !== undefined || updateData.phoneCountryCode !== undefined) {
      updates.push(`phone_cipher = $${paramCount++}`);
      // Combine phoneCountryCode and phone if both are provided, otherwise use existing logic
      let combinedPhone = '';
      if (updateData.phoneCountryCode && updateData.phone) {
        combinedPhone = `${updateData.phoneCountryCode}${updateData.phone}`;
      } else if (updateData.phone) {
        combinedPhone = updateData.phone;
      }
      values.push(encrypt(combinedPhone || ''));
    }
    if (updateData.address !== undefined) {
      updates.push(`address_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.address || ''));
    }
    if (updateData.guardianName !== undefined) {
      updates.push(`guardian_contact_name_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.guardianName || ''));
    }
    if (updateData.guardianPhone !== undefined) {
      updates.push(`guardian_contact_phone_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.guardianPhone || ''));
    }
    if (updateData.guardianEmail !== undefined) {
      updates.push(`guardian_contact_email_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.guardianEmail || ''));
    }
    if (updateData.medicalInfo !== undefined) {
      updates.push(`medical_info_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.medicalInfo || ''));
    }
    if (updateData.emergencyContact !== undefined) {
      updates.push(`emergency_contact_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.emergencyContact || ''));
    }
    if (updateData.playingHistory !== undefined) {
      updates.push(`playing_history_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.playingHistory || ''));
    }

    // Non-encrypted fields
    if (updateData.position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(updateData.position);
    }
    if (updateData.height !== undefined) {
      updates.push(`height_cm = $${paramCount++}`);
      values.push(updateData.height ? parseFloat(updateData.height) : null);
    }
    if (updateData.weight !== undefined) {
      updates.push(`weight_kg = $${paramCount++}`);
      values.push(updateData.weight ? parseFloat(updateData.weight) : null);
    }
    if (updateData.preferredFoot !== undefined) {
      updates.push(`preferred_foot = $${paramCount++}`);
      values.push(updateData.preferredFoot ? updateData.preferredFoot.toLowerCase() : null);
    }
    if (updateData.jerseyNumber !== undefined) {
      updates.push(`jersey_number = $${paramCount++}`);
      values.push(updateData.jerseyNumber ? parseInt(updateData.jerseyNumber) : null);
    }
    if (updateData.gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(updateData.gender || null);
    }
    if (updateData.registrationDate !== undefined) {
      updates.push(`registration_date = $${paramCount++}`);
      values.push(updateData.registrationDate ? new Date(updateData.registrationDate) : null);
    }

    // Handle missing fields that were not being saved
    if (updateData.nationality !== undefined) {
      updates.push(`nationality = $${paramCount++}`);
      values.push(updateData.nationality || null);
    }
    if (updateData.trainingStartDate !== undefined) {
      updates.push(`training_start_date = $${paramCount++}`);
      values.push(updateData.trainingStartDate ? new Date(updateData.trainingStartDate) : null);
    }
    if (updateData.trainingEndDate !== undefined) {
      updates.push(`training_end_date = $${paramCount++}`);
      values.push(updateData.trainingEndDate ? new Date(updateData.trainingEndDate) : null);
    }

    // Handle contact information fields
    if (updateData.currentClub !== undefined) {
      updates.push(`current_club_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.currentClub || ''));
    }
    if (updateData.city !== undefined) {
      updates.push(`city_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.city || ''));
    }
    if (updateData.country !== undefined) {
      updates.push(`country_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.country || ''));
    }
    if (updateData.emergencyPhone !== undefined) {
      updates.push(`emergency_phone_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.emergencyPhone || ''));
    }
    if (updateData.internalNotes !== undefined) {
      updates.push(`internal_notes_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.internalNotes || ''));
    }
    if (updateData.notes !== undefined) {
      updates.push(`notes_cipher = $${paramCount++}`);
      values.push(encrypt(updateData.notes || ''));
    }

    // Rich profile fields for academy players
    if (updateData.bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(updateData.bio);
    }
    if (updateData.career_history !== undefined) {
      updates.push(`career_history = $${paramCount++}`);
      values.push(updateData.career_history);
    }
    if (updateData.honours !== undefined) {
      updates.push(`honours = $${paramCount++}`);
      values.push(updateData.honours);
    }
    if (updateData.education !== undefined) {
      updates.push(`education = $${paramCount++}`);
      values.push(updateData.education);
    }
    if (updateData.video_links !== undefined) {
      updates.push(`video_links = $${paramCount++}`);
      values.push(Array.isArray(updateData.video_links) ? updateData.video_links : []);
    }
    if (updateData.transfermarket_link !== undefined) {
      updates.push(`transfermarket_link = $${paramCount++}`);
      values.push(updateData.transfermarket_link);
    }
    if (updateData.gallery_images !== undefined) {
      updates.push(`gallery_images = $${paramCount++}`);
      values.push(Array.isArray(updateData.gallery_images) ? updateData.gallery_images : []);
    }
    if (updateData.cover_image_url !== undefined) {
      updates.push(`cover_image_url = $${paramCount++}`);
      values.push(updateData.cover_image_url);
    }
    if (updateData.contact_email !== undefined) {
      updates.push(`contact_email = $${paramCount++}`);
      values.push(updateData.contact_email);
    }
    if (updateData.whatsapp_number !== undefined) {
      updates.push(`whatsapp_number = $${paramCount++}`);
      values.push(updateData.whatsapp_number);
    }
    if (updateData.social_links !== undefined) {
      updates.push(`social_links = $${paramCount++}`);
      values.push(typeof updateData.social_links === 'string' ? updateData.social_links : JSON.stringify(updateData.social_links || {}));
    }
    if (updateData.slug !== undefined) {
      updates.push(`slug = $${paramCount++}`);
      values.push(updateData.slug && updateData.slug.trim() !== '' ? updateData.slug.trim() : null);
    }
    if (updateData.display_name !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(updateData.display_name);
    }
    if (updateData.profile_image_url !== undefined) {
      updates.push(`profile_image_url = $${paramCount++}`);
      values.push(updateData.profile_image_url);
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    // Add player ID as the last parameter
    values.push(playerId);

    // Execute update query if there are fields to update
    if (updates.length > 0) {
      const updateQuery = `
        UPDATE players 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(updateQuery, values);
      const player = result.rows[0];

      // Decrypt data for the response
      const decryptedPlayer = {
        id: player.id,
        playerCardId: player.player_card_id,
        firstName: decrypt(player.first_name_cipher),
        lastName: decrypt(player.last_name_cipher),
        dateOfBirth: decrypt(player.dob_cipher),
        position: player.position,
        email: decrypt(player.email_cipher) || '',
        phone: decrypt(player.phone_cipher) || '',
        address: decrypt(player.address_cipher) || '',
        gender: player.gender || '',
        guardianName: decrypt(player.guardian_contact_name_cipher) || '',
        guardianPhone: decrypt(player.guardian_contact_phone_cipher) || '',
        guardianInfo: decrypt(player.guardian_info_cipher) || '',
        medicalInfo: decrypt(player.medical_info_cipher) || '',
        emergencyContact: decrypt(player.emergency_contact_cipher) || '',
        playingHistory: decrypt(player.playing_history_cipher) || '',
        height: player.height_cm || null,
        weight: player.weight_kg || null,
        preferredFoot: player.preferred_foot ? player.preferred_foot.charAt(0).toUpperCase() + player.preferred_foot.slice(1) : '',
        jerseyNumber: player.jersey_number || null,
        registrationDate: player.registration_date ? new Date(player.registration_date).toISOString().split('T')[0] : null,
        // Add the missing fields to the response
        nationality: player.nationality || '',
        trainingStartDate: player.training_start_date ? new Date(player.training_start_date).toISOString().split('T')[0] : null,
        trainingEndDate: player.training_end_date ? new Date(player.training_end_date).toISOString().split('T')[0] : null,
        emergencyPhone: player.emergency_phone_cipher ? decrypt(player.emergency_phone_cipher) : '',
        internalNotes: player.internal_notes_cipher ? decrypt(player.internal_notes_cipher) : '',
        notes: player.notes_cipher ? decrypt(player.notes_cipher) : '',
        cardId: player.card_id || '',
        cardQrSignature: player.card_qr_signature || '',
        // Rich profile fields
        bio: player.bio || '',
        career_history: player.career_history || '',
        honours: player.honours || '',
        education: player.education || '',
        video_links: player.video_links || [],
        transfermarket_link: player.transfermarket_link || '',
        gallery_images: player.gallery_images || [],
        cover_image_url: player.cover_image_url || '',
        contact_email: player.contact_email || '',
        whatsapp_number: player.whatsapp_number || '',
        social_links: player.social_links || {},
        slug: player.slug || '',
        display_name: player.display_name || '',
        profile_image_url: player.profile_image_url || '',
        isActive: player.is_active,
        createdAt: player.created_at.toISOString(),
        updatedAt: player.updated_at.toISOString(),
      };

      res.json({
        success: true,
        message: 'Player updated successfully',
        data: decryptedPlayer,
      });
    } else {
      // No fields to update
      res.json({
        success: true,
        message: 'No changes to update',
        data: {
          id: existing.id,
          firstName: decrypt(existing.first_name_cipher),
          lastName: decrypt(existing.last_name_cipher),
          dateOfBirth: decrypt(existing.dob_cipher),
          position: existing.position,
          email: decrypt(existing.email_cipher) || '',
          phone: decrypt(existing.phone_cipher) || '',
          address: decrypt(existing.address_cipher) || '',
          city: decrypt(existing.city_cipher) || '',
          country: decrypt(existing.country_cipher) || '',
          height: existing.height_cm || null,
          weight: existing.weight_kg || null,
          isActive: existing.is_active,
          createdAt: existing.created_at.toISOString(),
          updatedAt: existing.updated_at.toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Delete Player
export const handleDeletePlayer: RequestHandler = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Check if player exists and get encrypted data
    const checkQuery = 'SELECT id, first_name_cipher, last_name_cipher FROM players WHERE id = $1';
    const existingResult = await query(checkQuery, [playerId]);

    let existingPlayer;
    if (existingResult.rows.length === 0) {
      console.log(`[DeletePlayer] Player not found in players table: ${playerId}. Checking individual_players...`);
      const individualCheck = await query('SELECT id, first_name, last_name FROM individual_players WHERE id = $1', [playerId]);
      if (individualCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }
      
      // Unlink self-registered player from academy instead of full delete
      await query('UPDATE individual_players SET academy_id = NULL WHERE id = $1', [playerId]);
      
      const firstName = individualCheck.rows[0].first_name || 'Unknown';
      const lastName = individualCheck.rows[0].last_name || 'Player';
      
      return res.json({
        success: true,
        message: 'Player unlinked successfully',
        data: {
          id: playerId,
          firstName,
          lastName,
          deleted: true,
        },
      });
    }

    existingPlayer = existingResult.rows[0];

    // For now, implement hard delete since is_active column doesn't exist
    // In production, you might want to add the is_active column first
    const deleteQuery = 'DELETE FROM players WHERE id = $1 RETURNING id';
    const result = await query(deleteQuery, [playerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Decrypt the player names for the response
    const firstName = existingPlayer.first_name_cipher ? decrypt(existingPlayer.first_name_cipher) : 'Unknown';
    const lastName = existingPlayer.last_name_cipher ? decrypt(existingPlayer.last_name_cipher) : 'Player';

    res.json({
      success: true,
      message: 'Player deleted successfully',
      data: {
        id: playerId,
        firstName: firstName,
        lastName: lastName,
        deleted: true,
      },
    });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get Player Statistics
export const handleGetPlayerStatistics: RequestHandler = async (req, res) => {
  try {
    const academyId = (req as any).user?.id || req.query.academyId;

    if (!academyId) {
      return res.status(400).json({ success: false, message: 'Academy ID is required' });
    }

    // Total players count
    let totalPlayersCount = 0;
    try {
      const totalPlayersQuery = 'SELECT COUNT(*) as count FROM "Players" WHERE academy_id = $1';
      const result = await query(totalPlayersQuery, [academyId]);
      totalPlayersCount = parseInt(result.rows[0].count);
    } catch (e) {
      const totalPlayersQuery = 'SELECT COUNT(*) as count FROM players WHERE academy_id = $1';
      const result = await query(totalPlayersQuery, [academyId]);
      totalPlayersCount = parseInt(result.rows[0].count);
    }

    // Active players count (same as total since we don't have is_active column yet, or it's handled in where clause if it existed)
    // Using total for now as placeholder
    const activePlayersCount = totalPlayersCount;

    // Position statistics
    let positionStatsResult: any[] = [];
    try {
      const positionStatsQuery = `
        SELECT position, COUNT(*) as count 
        FROM "Players" 
        WHERE academy_id = $1 
        GROUP BY position 
        ORDER BY count DESC
      `;
      const result = await query(positionStatsQuery, [academyId]);
      positionStatsResult = result.rows;
    } catch (e) {
      const positionStatsQuery = `
        SELECT position, COUNT(*) as count 
        FROM players 
        WHERE academy_id = $1 
        GROUP BY position 
        ORDER BY count DESC
      `;
      const result = await query(positionStatsQuery, [academyId]);
      positionStatsResult = result.rows;
    }

    // Age groups statistics
    let ageGroupsResult: any[] = [];
    try {
      const ageGroupsQuery = `
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE)) - EXTRACT(YEAR FROM AGE(created_at)) < 12 THEN 'Under 12'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE)) - EXTRACT(YEAR FROM AGE(created_at)) < 15 THEN 'Under 15'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE)) - EXTRACT(YEAR FROM AGE(created_at)) < 18 THEN 'Under 18'
            ELSE 'Over 18'
          END as age_group,
          COUNT(*) as count
        FROM "Players" 
        WHERE academy_id = $1
        GROUP BY age_group
        ORDER BY count DESC
      `;
      const result = await query(ageGroupsQuery, [academyId]);
      ageGroupsResult = result.rows;
    } catch (e) {
      const ageGroupsQuery = `
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE)) - EXTRACT(YEAR FROM AGE(created_at)) < 12 THEN 'Under 12'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE)) - EXTRACT(YEAR FROM AGE(created_at)) < 15 THEN 'Under 15'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE)) - EXTRACT(YEAR FROM AGE(created_at)) < 18 THEN 'Under 18'
            ELSE 'Over 18'
          END as age_group,
          COUNT(*) as count
        FROM players 
        WHERE academy_id = $1
        GROUP BY age_group
        ORDER BY count DESC
      `;
      const result = await query(ageGroupsQuery, [academyId]);
      ageGroupsResult = result.rows;
    }

    // Recent players (using encrypted columns)
    const recentPlayersQuery = `
      SELECT id, first_name_cipher, last_name_cipher, position, created_at
      FROM players 
      WHERE academy_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const recentPlayersResult = await query(recentPlayersQuery, [academyId]);

    const totalPlayers = totalPlayersCount;
    const activePlayers = activePlayersCount;
    const formattedPositionStats = positionStatsResult.map(row => ({
      position: row.position,
      count: parseInt(row.count)
    }));
    const ageGroups = ageGroupsResult.map(row => ({
      ageGroup: row.age_group,
      count: parseInt(row.count)
    }));
    const recentPlayers = recentPlayersResult.rows.map(player => ({
      id: player.id,
      firstName: player.first_name_cipher ? decrypt(player.first_name_cipher) : '',
      lastName: player.last_name_cipher ? decrypt(player.last_name_cipher) : '',
      position: player.position,
      createdAt: player.created_at.toISOString()
    }));

    res.json({
      success: true,
      data: {
        totalPlayers,
        activePlayers,
        positionStats: formattedPositionStats,
        ageGroups,
        recentPlayers
      }
    });
  } catch (error) {
    console.error('Get player statistics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}



// Bulk Import Players
export const handleBulkImportPlayers: RequestHandler = async (req, res) => {
  try {
    const academyId = (req as any).user.id;
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Players array is required and cannot be empty'
      });
    }

    // Check academy's subscription limits
    const academyQuery = `
      SELECT a.*, 
        (SELECT COUNT(*) FROM players p WHERE p.academy_id = a.id AND p.is_active = true) as player_count,
        asub.id as subscription_id, 
        sp.name as plan_name, 
        sp.player_limit
      FROM academies a
      LEFT JOIN academy_subscriptions asub ON a.id = asub.academy_id AND asub.status = 'active' AND asub.end_date > NOW()
      LEFT JOIN subscription_plans sp ON asub.plan_id = sp.id
      WHERE a.id = $1
      ORDER BY asub.created_at DESC
      LIMIT 1
    `;

    const academyResult = await query(academyQuery, [academyId]);

    if (academyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Academy not found'
      });
    }

    const academy = academyResult.rows[0];

    if (!academy.subscription_id) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Check if bulk import would exceed player limit
    if (academy.player_limit !== -1) { // -1 means unlimited
      const newPlayerCount = parseInt(academy.player_count) + players.length;
      if (newPlayerCount > academy.player_limit) {
        return res.status(403).json({
          success: false,
          message: `Bulk import would exceed player limit. Your ${academy.plan_name} plan allows up to ${academy.player_limit} players. You currently have ${academy.player_count} players and are trying to add ${players.length} more.`
        });
      }
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each player
    for (let i = 0; i < players.length; i++) {
      const playerData = players[i];

      try {
        // Validate required fields
        if (!playerData.firstName || !playerData.lastName || !playerData.dateOfBirth || !playerData.position) {
          results.failed.push({
            row: i + 1,
            data: playerData,
            error: 'Missing required fields: firstName, lastName, dateOfBirth, position'
          });
          continue;
        }

        // Check jersey number conflict
        if (playerData.jerseyNumber) {
          const jerseyNumberQuery = `
            SELECT id FROM players 
            WHERE academy_id = $1 
            AND jersey_number = $2 
            AND is_active = true
          `;

          const jerseyResult = await query(jerseyNumberQuery, [
            academyId,
            parseInt(playerData.jerseyNumber)
          ]);

          if (jerseyResult.rows.length > 0) {
            results.failed.push({
              row: i + 1,
              data: playerData,
              error: `Jersey number ${playerData.jerseyNumber} is already taken`
            });
            continue;
          }
        }

        // Create player
        const playerId = uuidv4();
        const createPlayerQuery = `
          INSERT INTO players (
            id, academy_id, first_name, last_name, date_of_birth, position,
            email, phone, address, city, country, parent_name, parent_phone,
            parent_email, medical_info, emergency_contact, emergency_phone,
            height, weight, preferred_foot, jersey_number, notes, is_active,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
          ) RETURNING id, first_name, last_name, position, jersey_number
        `;

        const playerValues = [
          playerId,
          academyId,
          playerData.firstName,
          playerData.lastName,
          new Date(playerData.dateOfBirth),
          playerData.position,
          playerData.email || null,
          playerData.phone || null,
          playerData.address || null,
          playerData.city || null,
          playerData.country || null,
          playerData.parentName || null,
          playerData.parentPhone || null,
          playerData.parentEmail || null,
          playerData.medicalInfo || null,
          playerData.emergencyContact || null,
          playerData.emergencyPhone || null,
          playerData.height ? parseFloat(playerData.height) : null,
          playerData.weight ? parseFloat(playerData.weight) : null,
          playerData.preferredFoot || null,
          playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
          playerData.notes || null,
          true
        ];

        const playerResult = await query(createPlayerQuery, playerValues);
        const player = playerResult.rows[0];

        results.successful.push({
          row: i + 1,
          player: {
            id: player.id,
            firstName: player.first_name,
            lastName: player.last_name,
            position: player.position,
            jerseyNumber: player.jersey_number
          }
        });

      } catch (error) {
        results.failed.push({
          row: i + 1,
          data: playerData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log activity
    const logActivityQuery = `
      INSERT INTO activities (
        id, academy_id, action, description, metadata, ip_address, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW()
      )
    `;

    await query(logActivityQuery, [
      uuidv4(),
      academyId,
      'players_bulk_imported',
      `Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      JSON.stringify({
        totalAttempted: players.length,
        successful: results.successful.length,
        failed: results.failed.length
      }),
      req.ip
    ]);

    res.json({
      success: true,
      message: `Bulk import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('Bulk import players error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Check Slug Availability for academy players
export const handleCheckSlugAvailability: RequestHandler = async (req, res) => {
  try {
    const { slug, playerId } = req.body;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.json({ available: false, message: 'Link Name must contain only lowercase letters, numbers, and hyphens.' });
    }

    // Check if taken in player_profiles (individual players)
    const indyCheck = await query(
      'SELECT player_id FROM player_profiles WHERE slug = $1',
      [slug]
    );

    if (indyCheck.rows.length > 0) {
      return res.json({ available: false, message: 'Link Name is already taken.' });
    }

    // Check if taken in players (academy players)
    const academyCheck = await query(
      'SELECT id FROM players WHERE slug = $1 AND id != $2',
      [slug, playerId || '']
    );

    if (academyCheck.rows.length > 0) {
      return res.json({ available: false, message: 'Link Name is already taken.' });
    }

    res.json({ available: true, message: 'Link Name is available.' });
  } catch (error) {
    console.error('Check academy slug availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mount routes
router.get('/', handleGetAcademyPlayers);
router.get('/search', handleSearchPlayers);
router.get('/statistics', handleGetPlayerStatistics);
router.post('/check-slug-availability', handleCheckSlugAvailability);
router.get('/:playerId', handleGetPlayerDetails);
router.post('/', handleCreatePlayer);
router.put('/:playerId', handleUpdatePlayer);
router.delete('/:playerId', handleDeletePlayer);
router.post('/bulk-import', handleBulkImportPlayers);

export default router;