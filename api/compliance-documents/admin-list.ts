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

        // Fetch all compliance documents with academy details
        // Join: fifa_compliance_documents -> fifa_compliance -> academies
        const { data: documents, error } = await supabase
            .from('fifa_compliance_documents')
            .select(`
                *,
                fifa_compliance (
                    id,
                    academy_id,
                    academies (
                        id,
                        name,
                        email
                    )
                )
            `)
            .order('upload_date', { ascending: false });

        if (error) {
            console.error('[VERCEL] Error fetching admin compliance documents:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch compliance documents',
                error: error.message
            });
        }

        // Transform data for frontend
        const formattedDocuments = documents.map((doc: any) => ({
            id: doc.id,
            document_name: doc.document_name,
            document_type: doc.document_type,
            status: doc.status,
            upload_date: doc.upload_date,
            file_path: doc.file_path,
            academy_name: doc.fifa_compliance?.academies?.name || 'Unknown Academy',
            academy_email: doc.fifa_compliance?.academies?.email || '',
            academy_id: doc.fifa_compliance?.academy_id,
            file_url: doc.file_path ? supabase.storage.from('compliance-documents').getPublicUrl(doc.file_path).data.publicUrl : null
        }));

        return res.json({
            success: true,
            data: formattedDocuments
        });

    } catch (error: any) {
        console.error('[VERCEL] Admin compliance list error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance documents',
            error: error.message
        });
    }
}
