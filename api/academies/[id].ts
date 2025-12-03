import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log(`[VERCEL] Academy ${req.method} request received`);

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Academy ID is required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Handle GET request - Fetch academy details
        if (req.method === 'GET') {
            console.log(`[VERCEL] Fetching academy ${id}`);

            // Fetch academy details
            const { data, error } = await supabase
                .from('academies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('[VERCEL] Academy fetch error:', error);
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        message: 'Academy not found'
                    });
                }
                throw new Error(error.message);
            }

            // Fetch players
            const { data: playersData, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('academy_id', id);

            if (playersError) {
                console.error('[VERCEL] Players fetch error:', playersError);
                // Don't fail the whole request if players fetch fails, just log it
            }

            // Decrypt function (matches the simple encryption we're using)
            const decrypt = (value: any) => {
                if (!value) return '';
                if (typeof value === 'string' && value.startsWith('\\x')) {
                    return Buffer.from(value.slice(2), 'hex').toString('utf8');
                }
                if (Buffer.isBuffer(value)) return value.toString('utf8');
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

            // Transform players data
            const players = (playersData || []).map((player: any) => {
                const dob = decrypt(player.dob_cipher);
                return {
                    id: player.id,
                    firstName: decrypt(player.first_name_cipher),
                    lastName: decrypt(player.last_name_cipher),
                    position: player.position,
                    age: calculateAge(dob),
                    isActive: player.is_active !== false
                };
            });

            // Transform snake_case to camelCase for frontend
            const transformedData = {
                id: data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                city: data.district,
                country: data.province,
                code: data.code,
                directorName: data.director_name,
                directorEmail: data.director_email,
                directorPhone: data.director_phone,
                foundedYear: data.founded_year,
                website: data.website,
                description: data.description,
                isActive: data.is_active,
                isVerified: data.is_verified,
                storageUsed: data.storage_used || 0,
                player_count: players.length, // Use actual player count
                subscriptionPlan: data.subscription_plan || 'Free Plan',
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                players: players, // Include players in response
                activities: [], // Empty for now
                compliance: null // Empty for now
            };

            return res.status(200).json({
                success: true,
                data: transformedData
            });
        }

        // Handle PUT/PATCH request - Update academy
        if (req.method === 'PUT' || req.method === 'PATCH') {
            const body = req.body;
            console.log(`[VERCEL] Updating academy ${id} with data:`, body);

            // Map frontend camelCase fields to database snake_case columns
            const updateData: any = {};

            if (body.name) updateData.name = body.name;
            if (body.email) updateData.email = body.email;
            if (body.phone) updateData.phone = body.phone;
            if (body.address) updateData.address = body.address;
            if (body.city) updateData.district = body.city;
            if (body.country) updateData.province = body.country;
            if (body.contactPerson) updateData.contact_person = body.contactPerson;
            if (body.licenseNumber) updateData.license_number = body.licenseNumber;
            if (body.foundedYear) updateData.founded_year = body.foundedYear;
            if (body.website) updateData.website = body.website;
            if (body.description) updateData.description = body.description;
            if (body.directorName) updateData.director_name = body.directorName;
            if (body.directorEmail) updateData.director_email = body.directorEmail;
            if (body.directorPhone) updateData.director_phone = body.directorPhone;

            // Also support snake_case inputs just in case
            if (body.contact_person) updateData.contact_person = body.contact_person;
            if (body.license_number) updateData.license_number = body.license_number;
            if (body.founded_year) updateData.founded_year = body.founded_year;
            if (body.director_name) updateData.director_name = body.director_name;
            if (body.director_email) updateData.director_email = body.director_email;
            if (body.director_phone) updateData.director_phone = body.director_phone;

            // Perform update
            const { data, error } = await supabase
                .from('academies')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Academy update error:', error);
                throw new Error(error.message);
            }

            return res.status(200).json({
                success: true,
                message: 'Academy updated successfully',
                data: data
            });
        }

        // Handle DELETE request - Delete academy
        if (req.method === 'DELETE') {
            console.log(`[VERCEL] Deleting academy ${id}`);

            const { data, error } = await supabase
                .from('academies')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Academy delete error:', error);
                throw new Error(error.message);
            }

            return res.status(200).json({
                success: true,
                message: 'Academy deleted successfully'
            });
        }

        // Method not allowed
        return res.status(405).json({
            success: false,
            message: `Method ${req.method} not allowed`
        });

    } catch (error: any) {
        console.error('[VERCEL] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Operation failed',
            error: error.message
        });
    }
}
