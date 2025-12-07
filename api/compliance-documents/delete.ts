import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({ success: false, message: 'Document ID is required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Delete the document record
        // Note: In a real production system, you might also want to delete the file from Storage.
        // Assuming we just delete the record for now or triggers handle storage.
        const { error } = await supabase
            .from('fifa_compliance_documents')
            .delete()
            .eq('id', documentId);

        if (error) {
            console.error('[VERCEL] Error deleting document:', error);
            throw new Error('Failed to delete document record');
        }

        return res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error: any) {
        console.error('[VERCEL] Delete document error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
