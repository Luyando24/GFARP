import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { academyId } = req.query;

        if (!academyId || academyId === 'undefined' || academyId === 'null') {
            return res.status(400).json({
                success: false,
                message: 'Valid Academy ID is required'
            });
        }

        // Validate UUID format to prevent database errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(academyId as string)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Academy ID format'
            });
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

        // Fetch compliance documents for this academy by joining with the parent fifa_compliance table
        // The documents table is linked to fifa_compliance, which is linked to academies
        const { data: documents, error } = await supabase
            .from('fifa_compliance_documents')
            .select(`
                *,
                fifa_compliance!inner (
                    academy_id
                )
            `)
            .eq('fifa_compliance.academy_id', academyId)
            .order('upload_date', { ascending: false });

        if (error) {
            console.error('[VERCEL] Error fetching compliance documents:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch compliance documents',
                error: error.message
            });
        }

        return res.json({
            success: true,
            data: documents || []
        });

    } catch (error: any) {
        console.error('[VERCEL] Compliance documents error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance documents',
            error: error.message
        });
    }
}
