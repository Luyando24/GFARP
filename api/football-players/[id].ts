
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
        console.error('[VERCEL] Missing Supabase environment variables');
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

    // Decrypt function
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

    // Encrypt function (simple pass-through for now, matching other endpoints)
    const encrypt = (text: string) => text || '';

    // Handle GET - Get player details
    if (req.method === 'GET') {
        try {
            const { data: player, error } = await supabase
                .from('players')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !player) {
                console.error('[VERCEL] Error fetching player details:', error);
                return res.status(404).json({
                    success: false,
                    message: 'Player not found'
                });
            }

            // Map database fields to frontend model
            const mappedPlayer = {
                id: player.id,
                playerCardId: player.player_card_id,
                firstName: decrypt(player.first_name_cipher) || player.first_name || '',
                lastName: decrypt(player.last_name_cipher) || player.last_name || '',
                dateOfBirth: decrypt(player.dob_cipher) || (player.date_of_birth ? new Date(player.date_of_birth).toISOString() : '') || '',
                position: player.position,
                email: decrypt(player.email_cipher) || player.email || '',
                phone: decrypt(player.phone_cipher) || player.phone || '',
                address: decrypt(player.address_cipher) || player.address || '',
                city: decrypt(player.city_cipher) || player.city || '',
                country: decrypt(player.country_cipher) || player.country || '',
                nationality: player.nationality,
                currentClub: decrypt(player.current_club_cipher) || player.current_club || '',
                height: player.height_cm || player.height || null,
                weight: player.weight_kg || player.weight || null,
                preferredFoot: player.preferred_foot,
                jerseyNumber: player.jersey_number,
                gender: player.gender,
                
                // Guardian/Parent info
                guardianName: decrypt(player.guardian_contact_name_cipher) || player.parent_name || '',
                guardianPhone: decrypt(player.guardian_contact_phone_cipher) || player.parent_phone || '',
                guardianEmail: decrypt(player.guardian_contact_email_cipher) || player.parent_email || '',
                guardianInfo: decrypt(player.guardian_info_cipher) || '',
                
                // Medical & Emergency
                medicalInfo: decrypt(player.medical_info_cipher) || player.medical_info || '',
                emergencyContact: decrypt(player.emergency_contact_cipher) || player.emergency_contact || '',
                emergencyPhone: decrypt(player.emergency_phone_cipher) || player.emergency_phone || '',
                
                // Notes & History
                playingHistory: decrypt(player.playing_history_cipher) || '',
                internalNotes: decrypt(player.internal_notes_cipher) || '',
                notes: decrypt(player.notes_cipher) || player.notes || '',
                
                // Dates
                registrationDate: player.registration_date,
                trainingStartDate: player.training_start_date,
                trainingEndDate: player.training_end_date,
                
                // System
                cardId: player.card_id,
                cardQrSignature: player.card_qr_signature,
                isActive: player.is_active !== false,
                createdAt: player.created_at,
                updatedAt: player.updated_at
            };

            return res.status(200).json({
                success: true,
                data: mappedPlayer
            });

        } catch (error: any) {
            console.error('[VERCEL] Get player details error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Handle PUT - Update player
    if (req.method === 'PUT') {
        try {
            const body = req.body;
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Map frontend fields to database columns (encrypted)
            if (body.firstName) updateData.first_name_cipher = encrypt(body.firstName);
            if (body.lastName) updateData.last_name_cipher = encrypt(body.lastName);
            if (body.dateOfBirth) updateData.dob_cipher = encrypt(body.dateOfBirth);
            if (body.email) updateData.email_cipher = encrypt(body.email);
            if (body.address) updateData.address_cipher = encrypt(body.address);
            if (body.city) updateData.city_cipher = encrypt(body.city);
            if (body.country) updateData.country_cipher = encrypt(body.country);
            if (body.currentClub) updateData.current_club_cipher = encrypt(body.currentClub);
            
            // Phone handling
            if (body.phone) {
                let combinedPhone = body.phone;
                if (body.phoneCountryCode) {
                    // Strip country code from phone if it's already there to avoid double prefix
                    const phoneClean = body.phone.replace(/^\+/, '');
                    const codeClean = body.phoneCountryCode.replace(/^\+/, '');
                    if (!phoneClean.startsWith(codeClean)) {
                        combinedPhone = `${body.phoneCountryCode}${body.phone}`;
                    }
                }
                updateData.phone_cipher = encrypt(combinedPhone);
            }

            // Guardian info
            if (body.guardianName) updateData.guardian_contact_name_cipher = encrypt(body.guardianName);
            if (body.guardianPhone) updateData.guardian_contact_phone_cipher = encrypt(body.guardianPhone);
            if (body.guardianEmail) updateData.guardian_contact_email_cipher = encrypt(body.guardianEmail);
            if (body.guardianInfo) updateData.guardian_info_cipher = encrypt(body.guardianInfo);

            // Medical & Emergency
            if (body.medicalInfo) updateData.medical_info_cipher = encrypt(body.medicalInfo);
            if (body.emergencyContact) updateData.emergency_contact_cipher = encrypt(body.emergencyContact);
            if (body.emergencyPhone) updateData.emergency_phone_cipher = encrypt(body.emergencyPhone);

            // Notes & History
            if (body.playingHistory) updateData.playing_history_cipher = encrypt(body.playingHistory);
            if (body.internalNotes) updateData.internal_notes_cipher = encrypt(body.internalNotes);
            if (body.notes) updateData.notes_cipher = encrypt(body.notes);

            // Direct fields
            if (body.position) updateData.position = body.position;
            if (body.nationality) updateData.nationality = body.nationality;
            if (body.gender) updateData.gender = body.gender;
            if (body.preferredFoot) updateData.preferred_foot = body.preferredFoot;
            if (body.height !== undefined) updateData.height_cm = body.height ? parseInt(body.height) : null;
            if (body.weight !== undefined) updateData.weight_kg = body.weight ? parseFloat(body.weight) : null;
            if (body.jerseyNumber !== undefined) updateData.jersey_number = body.jerseyNumber ? parseInt(body.jerseyNumber) : null;
            
            if (body.trainingStartDate) updateData.training_start_date = body.trainingStartDate;
            if (body.trainingEndDate) updateData.training_end_date = body.trainingEndDate;
            if (body.isActive !== undefined) updateData.is_active = body.isActive;

            const { data: updatedPlayer, error } = await supabase
                .from('players')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Update player error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update player',
                    error: error.message
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Player updated successfully',
                data: updatedPlayer
            });

        } catch (error: any) {
            console.error('[VERCEL] Update player error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Handle DELETE - Delete player
    if (req.method === 'DELETE') {
        try {
            const { error } = await supabase
                .from('players')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('[VERCEL] Delete player error:', error);
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
            console.error('[VERCEL] Delete player error:', error);
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
