import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Academy update request received');

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Allow PUT (and PATCH just in case)
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        const body = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Academy ID is required' });
        }

        console.log(`[VERCEL] Updating academy ${id} with data:`, body);

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Map frontend camelCase fields to database snake_case columns
        const updateData: any = {};

        if (body.name) updateData.name = body.name;
        if (body.phone) updateData.phone = body.phone;
        if (body.address) updateData.address = body.address;
        if (body.city) updateData.district = body.city; // Mapping city to district
        if (body.country) updateData.province = body.country; // Mapping country to province
        if (body.directorName) updateData.director_name = body.directorName;
        if (body.directorEmail) updateData.director_email = body.directorEmail;
        if (body.directorPhone) updateData.director_phone = body.directorPhone;
        if (body.foundedYear) updateData.founded_year = body.foundedYear;

        // Also support snake_case inputs just in case
        if (body.director_name) updateData.director_name = body.director_name;
        if (body.director_email) updateData.director_email = body.director_email;
        if (body.director_phone) updateData.director_phone = body.director_phone;
        if (body.founded_year) updateData.founded_year = body.founded_year;

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

    } catch (error: any) {
        console.error('[VERCEL] Update error:', error);
        return res.status(500).json({
            success: false,
            message: 'Update failed',
            error: error.message
        });
    }
}
