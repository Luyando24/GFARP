import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid player ID'
        });
    }

    // Decrypt function (reused from main handler)
    const decrypt = (value: any) => {
        if (!value) return '';
        if (typeof value === 'string' && value.startsWith('\\x')) {
            return Buffer.from(value.slice(2), 'hex').toString('utf8');
        }
        if (Buffer.isBuffer(value)) {
            return value.toString('utf8');
        }
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
            return Buffer.from(value).toString('utf8');
        }
        if (typeof value === 'string') return value;
        return String(value);
    };

    // Calculate age
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

    // GET - Fetch single player
    if (req.method === 'GET') {
        try {
            const { data: player, error } = await supabase
                .from('players')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('[VERCEL] Error fetching player:', error);
                return res.status(404).json({
                    success: false,
                    message: 'Player not found'
                });
            }

            const transformedPlayer = {
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
            };

            return res.status(200).json({
                success: true,
                data: transformedPlayer
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // DELETE - Delete player
    if (req.method === 'DELETE') {
        try {
            const { error } = await supabase
                .from('players')
                .delete()
                .eq('id', id);

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete player',
                    error: error.message
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Player deleted successfully'
            });
        } catch (error: any) {
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
