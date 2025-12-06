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
    res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'PUT' && req.method !== 'DELETE') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Document ID is required'
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

        // Handle UPDATE
        if (req.method === 'PUT') {
            const { document_name, document_type, expiry_date, status } = req.body;

            console.log(`[VERCEL] Updating compliance document: ${id}`);

            const { data, error } = await supabase
                .from('fifa_compliance_documents')
                .update({
                    document_name,
                    document_type,
                    expiry_date,
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Update error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update document',
                    error: error.message
                });
            }

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            return res.json({
                success: true,
                message: 'Document updated successfully',
                data
            });
        }

        // Handle DELETE (Hard delete as no soft-delete column exists)
        if (req.method === 'DELETE') {
            console.log(`[VERCEL] Deleting compliance document: ${id}`);

            // First get the file path to delete from storage if needed. 
            // For now, we'll just delete the record. Storage cleanup typically handled by triggers or manual cleanup.

            const { data, error } = await supabase
                .from('fifa_compliance_documents')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Delete error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete document',
                    error: error.message
                });
            }

            // Note: In Supabase delete() returns rows only if select() is called.
            // If ID wasn't found, it might simply return no data but no error, or data as null/empty array depending on version.
            // But with single(), it returns error if no rows.

            return res.json({
                success: true,
                message: 'Document deleted successfully'
            });
        }

    } catch (error: any) {
        console.error('[VERCEL] Compliance document operation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to perform operation',
            error: error.message
        });
    }
}
