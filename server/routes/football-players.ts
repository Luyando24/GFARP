import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Simple encryption function (in production, use proper encryption)
const encrypt = (text: string) => {
  if (!text) return Buffer.from('');
  return Buffer.from(text, 'utf8');
};

// Simple decryption function (in production, use proper decryption)
const decrypt = (buffer: Buffer) => {
  if (!buffer) return null;
  return buffer.toString('utf8');
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
    if (academyId) {
      // Get academy's current subscription and plan details
      const subscriptionQuery = `
        SELECT 
          sp.name as plan_name,
          sp.player_limit,
          sp.id as plan_id,
          asub.status as subscription_status
        FROM academy_subscriptions asub
        JOIN subscription_plans sp ON asub.plan_id = sp.id
        WHERE asub.academy_id = $1 
          AND asub.status = 'active'
          AND asub.end_date > NOW()
        ORDER BY asub.created_at DESC
        LIMIT 1
      `;

      const subscriptionResult = await query(subscriptionQuery, [academyId]);

      let subscription;
      // Check if there's no subscription at all
      if (subscriptionResult.rows.length === 0) {
        // Get the free plan from the database
        const freePlanQuery = `
          SELECT id, name, player_limit 
          FROM subscription_plans 
          WHERE is_free = true 
          LIMIT 1
        `;
        const freePlanResult = await query(freePlanQuery);

        if (freePlanResult.rows.length > 0) {
          const freePlan = freePlanResult.rows[0];
          subscription = {
            plan_name: freePlan.name,
            player_limit: freePlan.player_limit,
            plan_id: freePlan.id
          };
        } else {
          // Fallback if no free plan is configured in the DB
          return res.status(500).json({
            success: false,
            message: 'No free plan configured. Please contact support.'
          });
        }

        // Check if they've already reached the free plan limit
        const playerCountQuery = `
          SELECT COUNT(*) as player_count 
          FROM players 
          WHERE academy_id = $1 AND is_active = true
        `;

        const playerCountResult = await query(playerCountQuery, [academyId]);
        const currentPlayerCount = parseInt(playerCountResult.rows[0].player_count);

        if (currentPlayerCount >= subscription.player_limit) {
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
            WHERE academy_id = $1 AND is_active = true
          `;

          const playerCountResult = await query(playerCountQuery, [academyId]);
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
        card_id, card_qr_signature, academy_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23,
        $24, $25, $26,
        $27, $28, $29, NOW(), NOW()
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
      academyId                                   // $29 - academy_id
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

    const offset = (page - 1) * limit;

    const decrypt = (buffer: Buffer) => {
      if (!buffer) return null;
      return buffer.toString('utf8');
    };

    const baseSelect = `
      SELECT id, player_card_id, first_name_cipher, last_name_cipher, dob_cipher, 
             position, email_cipher, phone_cipher, jersey_number, height_cm, weight_kg,
             preferred_foot, created_at, updated_at
      FROM players
    `;
    const countSelect = `SELECT COUNT(*)::int as count FROM players`;

    let whereClause = '';
    const params: any[] = [];

    if (academyId) {
      whereClause = ' WHERE academy_id = $1';
      params.push(academyId);
    }

    const orderLimitClause = ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const baseQuery = baseSelect + whereClause + orderLimitClause;
    const finalParams = [...params, limit, offset];

    const countQuery = countSelect + whereClause;
    const countParams = [...params];

    const { rows } = await query(baseQuery, finalParams);
    const countRes = await query(countQuery, countParams);
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
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query_param || query_param.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const decrypt = (buffer: Buffer) => {
      if (!buffer) return null;
      return buffer.toString('utf8');
    };

    // Search in encrypted first_name and last_name fields
    // Note: This is a simplified search - in production you'd want more sophisticated search
    const searchQuery = `
      SELECT id, player_card_id, first_name_cipher, last_name_cipher, 
             position, current_club_cipher, created_at, updated_at
      FROM players
      WHERE academy_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const params = [academyId, limit];
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

    // Simple decryption function (in production, use proper decryption)
    const decrypt = (buffer: Buffer) => {
      if (!buffer) return null;
      return buffer.toString('utf8');
    };

    // Fetch player from database
    const playerQuery = `SELECT id, player_card_id, first_name_cipher, last_name_cipher, 
                                dob_cipher, position, email_cipher, phone_cipher, 
                                address_cipher, guardian_contact_name_cipher, guardian_contact_phone_cipher,
                                guardian_contact_email_cipher, medical_info_cipher, emergency_contact_cipher,
                                height_cm, weight_kg, preferred_foot, jersey_number,
                                guardian_info_cipher, playing_history_cipher, gender,
                                registration_date, card_id, card_qr_signature,
                                nationality, training_start_date, training_end_date,
                                emergency_phone_cipher, internal_notes_cipher, notes_cipher,
                                current_club_cipher, city_cipher, country_cipher,
                                created_at, updated_at
                         FROM players WHERE id = $1`;
    const playerResult = await query(playerQuery, [playerId]);

    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const player = playerResult.rows[0];

    res.json({
      success: true,
      data: {
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
        emergencyPhone: player.emergency_phone_cipher ? decrypt(player.emergency_phone_cipher) : '',
        internalNotes: player.internal_notes_cipher ? decrypt(player.internal_notes_cipher) : '',
        notes: player.notes_cipher ? decrypt(player.notes_cipher) : '',
        // Add the new contact info fields
        currentClub: player.current_club_cipher ? decrypt(player.current_club_cipher) : '',
        city: player.city_cipher ? decrypt(player.city_cipher) : '',
        country: player.country_cipher ? decrypt(player.country_cipher) : '',
        cardId: player.card_id || '',
        cardQrSignature: player.card_qr_signature || '',
        isActive: true,
        createdAt: player.created_at.toISOString(),
        updatedAt: player.updated_at.toISOString()
      }
    });

  } catch (error) {
    console.error('Get player details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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
      return res.status(404).json({ success: false, message: 'Player not found' });
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
          firstName: existing.first_name,
          lastName: existing.last_name,
          dateOfBirth: existing.date_of_birth ? new Date(existing.date_of_birth).toISOString().split('T')[0] : null,
          position: existing.position,
          email: existing.email || '',
          phone: existing.phone || '',
          address: existing.address || '',
          city: existing.city || '',
          country: existing.nationality || '',
          height: existing.height || null,
          weight: existing.weight || null,
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

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const existingPlayer = existingResult.rows[0];

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
    const totalPlayersQuery = 'SELECT COUNT(*) as count FROM players WHERE academy_id = $1';

    // Active players count (same as total since we don't have is_active column yet)
    const activePlayersQuery = 'SELECT COUNT(*) as count FROM players WHERE academy_id = $1';

    // Position statistics
    const positionStatsQuery = `
      SELECT position, COUNT(*) as count 
      FROM players 
      WHERE academy_id = $1 
      GROUP BY position 
      ORDER BY count DESC
    `;

    // Age groups statistics
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

    // Recent players (using encrypted columns)
    const recentPlayersQuery = `
      SELECT id, first_name_cipher, last_name_cipher, position, created_at
      FROM players 
      WHERE academy_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const [
      totalPlayersResult,
      activePlayersResult,
      positionStatsResult,
      ageGroupsResult,
      recentPlayersResult
    ] = await Promise.all([
      query(totalPlayersQuery, [academyId]),
      query(activePlayersQuery, [academyId]),
      query(positionStatsQuery, [academyId]),
      query(ageGroupsQuery, [academyId]),
      query(recentPlayersQuery, [academyId])
    ]);

    const totalPlayers = parseInt(totalPlayersResult.rows[0].count);
    const activePlayers = parseInt(activePlayersResult.rows[0].count);
    const positionStats = positionStatsResult.rows.map(row => ({
      position: row.position,
      count: parseInt(row.count)
    }));
    const ageGroups = ageGroupsResult.rows.map(row => ({
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
        positionStats,
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

// Mount routes
router.get('/', handleGetAcademyPlayers);
router.get('/search', handleSearchPlayers);
router.get('/statistics', handleGetPlayerStatistics);
router.get('/:playerId', handleGetPlayerDetails);
router.post('/', handleCreatePlayer);
router.put('/:playerId', handleUpdatePlayer);
router.delete('/:playerId', handleDeletePlayer);
router.post('/bulk-import', handleBulkImportPlayers);

export default router;