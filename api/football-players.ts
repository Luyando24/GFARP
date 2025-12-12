import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[VERCEL] Missing Supabase environment variables');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle GET - List players
    if (req.method === 'GET') {
        try {
            const academyId = req.query.academyId as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = (page - 1) * limit;

            if (!academyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Academy ID is required'
                });
            }

            // Get total count
            const { count, error: countError } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', academyId);

            if (countError) {
                console.error('[VERCEL] Error counting players:', countError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to count players',
                    error: countError.message
                });
            }

            // Get paginated players
            const { data: players, error } = await supabase
                .from('players')
                .select('*')
                .eq('academy_id', academyId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('[VERCEL] Error fetching players:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch players',
                    error: error.message
                });
            }

            // Decrypt function (matches the simple encryption we're using)
            const decrypt = (value: any) => {
                if (!value) return '';

                // If it's a string starting with \x (PostgreSQL bytea hex format)
                if (typeof value === 'string' && value.startsWith('\\x')) {
                    // Remove \x prefix and convert hex to utf8
                    return Buffer.from(value.slice(2), 'hex').toString('utf8');
                }

                // If it's a Buffer
                if (Buffer.isBuffer(value)) {
                    return value.toString('utf8');
                }

                // If it's a Uint8Array or ArrayBuffer
                if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
                    return Buffer.from(value).toString('utf8');
                }

                // If it's already a string, return it
                if (typeof value === 'string') return value;

                return String(value);
            };

            // Calculate age from date of birth
            const calculateAge = (dob: string) => {
                if (!dob) return null;
                const birthDate = new Date(dob);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                return age;
            };

            // Transform players data to frontend format
            const transformedPlayers = (players || []).map((player: any) => ({
                id: player.id,
                playerCardId: player.player_card_id,
                firstName: decrypt(player.first_name_cipher),
                lastName: decrypt(player.last_name_cipher),
                dateOfBirth: decrypt(player.dob_cipher),
                age: calculateAge(decrypt(player.dob_cipher)),
                position: player.position,
                email: decrypt(player.email_cipher),
                phone: decrypt(player.phone_cipher),
                address: decrypt(player.address_cipher),
                city: decrypt(player.city_cipher),
                country: decrypt(player.country_cipher),
                nationality: player.nationality,
                height: player.height_cm,
                weight: player.weight_kg,
                jerseyNumber: player.jersey_number,
                preferredFoot: player.preferred_foot,
                guardianName: decrypt(player.guardian_contact_name_cipher),
                guardianPhone: decrypt(player.guardian_contact_phone_cipher),
                medicalInfo: decrypt(player.medical_info_cipher),
                emergencyContact: decrypt(player.emergency_contact_cipher),
                playingHistory: decrypt(player.playing_history_cipher),
                currentClub: decrypt(player.current_club_cipher),
                isActive: player.is_active !== false,
                createdAt: player.created_at,
                updatedAt: player.updated_at
            }));

            return res.status(200).json({
                success: true,
                data: {
                    players: transformedPlayers,
                    total: count || 0,
                    page,
                    limit
                }
            });
        } catch (error: any) {
            console.error('[VERCEL] Get players error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Handle POST - Create player
    if (req.method === 'POST') {
        try {
            const body = req.body;
            console.log('[VERCEL] Player creation request received');

            // Validate required fields
            if (!body.firstName || !body.lastName || !body.dateOfBirth || !body.position) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: firstName, lastName, dateOfBirth, position'
                });
            }

            if (!body.academyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Academy ID is required'
                });
            }

            // Combine phoneCountryCode and phone if both are provided
            let combinedPhone = '';
            if (body.phoneCountryCode && body.phone) {
                combinedPhone = `${body.phoneCountryCode}${body.phone}`;
            } else if (body.phone) {
                combinedPhone = body.phone;
            }

            // Generate IDs
            const playerId = uuidv4();
            const playerCardId = Math.random().toString(36).substr(2, 6).toUpperCase();
            const cardId = `CARD-${Date.now()}`;
            const cardQrSignature = `QR-${playerId}`;

            const encrypt = (text: string) => text || '';

            // Check subscription and player limits
            console.log('[VERCEL] Checking subscription and player limits');

            // Get current player count for this academy
            const { count: currentPlayerCount, error: countError } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('academy_id', body.academyId)
                .eq('is_active', true);

            if (countError) {
                console.error('[VERCEL] Error counting players:', countError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to check player count',
                    error: countError.message
                });
            }

            // Get academy's active subscription
            const { data: subscription, error: subError } = await supabase
                .from('academy_subscriptions')
                .select(`
                    *,
                    subscription_plans (
                        id,
                        name,
                        player_limit
                    )
                `)
                .eq('academy_id', body.academyId)
                .in('status', ['active', 'ACTIVE'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (subError && subError.code !== 'PGRST116') {
                console.error('[VERCEL] Error fetching subscription:', subError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to check subscription',
                    error: subError.message
                });
            }

            // Determine player limit (default to 3 for free/no subscription)
            const playerLimit = subscription?.subscription_plans?.player_limit || 3;

            console.log('[VERCEL] Player limit check:', {
                currentCount: currentPlayerCount,
                limit: playerLimit,
                hasSubscription: !!subscription
            });

            // Check if limit is reached
            if ((currentPlayerCount || 0) >= playerLimit) {
                console.log('[VERCEL] Player limit reached');
                return res.status(403).json({
                    success: false,
                    message: `Player limit reached. Your current plan allows ${playerLimit} player${playerLimit !== 1 ? 's' : ''}. Please upgrade your subscription to add more players.`,
                    error: 'PLAYER_LIMIT_REACHED',
                    details: {
                        currentCount: currentPlayerCount,
                        limit: playerLimit,
                        planName: subscription?.subscription_plans?.name || 'Free Plan'
                    }
                });
            }

            // Prepare player data
            const playerData = {
                id: playerId,
                player_card_id: playerCardId,
                first_name_cipher: encrypt(body.firstName),
                last_name_cipher: encrypt(body.lastName),
                email_cipher: encrypt(body.email || ''),
                phone_cipher: encrypt(combinedPhone),
                dob_cipher: encrypt(body.dateOfBirth),
                address_cipher: encrypt(body.address || ''),
                guardian_contact_name_cipher: encrypt(body.guardianName || ''),
                guardian_contact_phone_cipher: encrypt(body.guardianPhone || ''),
                guardian_contact_email_cipher: encrypt(body.guardianEmail || ''),
                position: body.position,
                preferred_foot: body.preferredFoot ? body.preferredFoot : null,
                height_cm: body.height ? parseInt(body.height) : null,
                weight_kg: body.weight ? parseFloat(body.weight) : null,
                jersey_number: body.jerseyNumber ? parseInt(body.jerseyNumber) : null,
                registration_date: new Date(),
                guardian_info_cipher: body.guardianName ? encrypt(`${body.guardianName} - ${body.guardianPhone || 'No phone'}`) : null,
                medical_info_cipher: encrypt(body.medicalInfo || ''),
                playing_history_cipher: encrypt(body.playingHistory || ''),
                emergency_contact_cipher: encrypt(body.emergencyContact || ''),
                emergency_phone_cipher: encrypt(body.emergencyPhone || ''),
                current_club_cipher: encrypt(body.currentClub || ''),
                city_cipher: encrypt(body.city || ''),
                country_cipher: encrypt(body.country || ''),
                nationality: body.nationality || null,
                training_start_date: body.trainingStartDate || null,
                training_end_date: body.trainingEndDate || null,
                internal_notes_cipher: encrypt(body.internalNotes || ''),
                card_id: cardId,
                card_qr_signature: cardQrSignature,
                academy_id: body.academyId,
                gender: 'Unknown',
                nrc_hash: `HASH-${playerId}`,
                nrc_salt: `SALT-${Date.now()}`,
                is_active: true
            };

            console.log('[VERCEL] Inserting player into database');

            // Insert player into database
            const { data: createdPlayer, error } = await supabase
                .from('players')
                .insert(playerData)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Player creation error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create player',
                    error: error.message
                });
            }

            console.log('[VERCEL] Player created successfully:', createdPlayer.id);

            return res.status(201).json({
                success: true,
                data: {
                    player: {
                        id: createdPlayer.id,
                        playerCardId: createdPlayer.player_card_id,
                        firstName: body.firstName,
                        lastName: body.lastName,
                        dateOfBirth: body.dateOfBirth,
                        nationality: body.nationality || 'Unknown',
                        position: createdPlayer.position,
                        email: body.email || null,
                        phone: body.phone || null,
                        height: createdPlayer.height_cm || null,
                        weight: createdPlayer.weight_kg || null,
                        jerseyNumber: createdPlayer.jersey_number || null,
                        preferredFoot: body.preferredFoot || null,
                        isActive: true,
                        createdAt: createdPlayer.created_at,
                        updatedAt: createdPlayer.updated_at,
                    },
                },
                message: 'Player created successfully',
            });

        } catch (error: any) {
            console.error('[VERCEL] Player creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: 'Method not allowed'
    });
}
