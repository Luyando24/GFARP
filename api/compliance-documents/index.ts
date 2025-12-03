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

        if (!academyId) {
            return res.status(400).json({
                success: false,
                message: 'Academy ID is required'
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

        // Fetch compliance documents for this academy
        // Note: The table schema uses 'user_id' to store the academy/user reference
        // but it might be 'academy_id' in some versions. We'll try to be smart about it.
        
        // First try with user_id (which is what the error message suggests is the correct column if academy_id is missing)
        let { data: documents, error } = await supabase
            .from('fifa_compliance_documents')
            .select('*')
            .eq('user_id', academyId)
            .eq('is_active', true)
            .order('uploaded_at', { ascending: false });

        // If user_id query failed or returned nothing, try academy_id as fallback
        // But only if the error was specifically about the column not existing
        if (error && error.message.includes('column "user_id" does not exist')) {
             const fallbackResult = await supabase
                .from('fifa_compliance_documents')
                .select('*')
                .eq('academy_id', academyId)
                .eq('is_active', true)
                .order('uploaded_at', { ascending: false });
                
             documents = fallbackResult.data;
             error = fallbackResult.error;
        } else if (error && error.message.includes('column fifa_compliance_documents.academy_id does not exist')) {
            // If the initial error (which we might have seen in logs) was about academy_id,
            // then user_id MUST be the correct one. 
            // So if we are here, it means the FIRST query (using user_id) failed with something else?
            // No, wait. The logic above is:
            // 1. Try user_id.
            // 2. If that fails saying "user_id does not exist", try academy_id.
            
            // The user reported "column fifa_compliance_documents.academy_id does not exist".
            // This means the previous code (which used academy_id) failed.
            // So the correct column IS likely 'user_id'.
            
            // So my first attempt above (using user_id) is the correct primary strategy.
            // If THAT fails, we handle it.
        }

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
