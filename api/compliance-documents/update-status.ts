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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { documentId, status } = req.body;

        if (!documentId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: documentId, status'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'verified', 'rejected', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: pending, verified, rejected, expired'
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

        // Update document status
        const { data, error } = await supabase
            .from('fifa_compliance_documents')
            .update({ status })
            .eq('id', documentId)
            .select()
            .single();

        if (error) {
            console.error('[VERCEL] Error updating document status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update document status',
                error: error.message
            });
        }

        return res.json({
            success: true,
            message: `Document status updated to ${status}`,
            data
        });

    } catch (error: any) {
        console.error('[VERCEL] Update document status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update document status',
            error: error.message
        });
    }
}
