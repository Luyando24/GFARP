
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID parameter is required' });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[VERCEL] Missing Supabase environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle GET - List documents for a player
    if (req.method === 'GET') {
        try {
            // id is playerId
            const { data: documents, error } = await supabase
                .from('player_documents')
                .select('*')
                .eq('player_id', id)
                .eq('is_active', true)
                .order('upload_date', { ascending: false });

            if (error) {
                console.error('[VERCEL] Error fetching documents:', error);
                return res.status(500).json({ error: 'Failed to fetch documents' });
            }

            const mappedDocuments = documents.map(doc => {
                const { data: urlData } = supabase.storage
                    .from('player-documents')
                    .getPublicUrl(doc.file_path);

                return {
                    id: doc.id,
                    document_type: doc.document_type,
                    original_filename: doc.original_filename,
                    file_size: doc.file_size,
                    mime_type: doc.mime_type,
                    uploaded_at: doc.upload_date,
                    uploaded_by: doc.uploaded_by,
                    file_url: urlData.publicUrl
                };
            });

            return res.status(200).json({ documents: mappedDocuments });

        } catch (error: any) {
            console.error('[VERCEL] Get documents error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Handle DELETE - Delete a document
    if (req.method === 'DELETE') {
        try {
            // id is documentId
            
            // First get the file path
            const { data: doc, error: fetchError } = await supabase
                .from('player_documents')
                .select('file_path')
                .eq('id', id)
                .single();

            if (fetchError || !doc) {
                return res.status(404).json({ error: 'Document not found' });
            }

            // Soft delete in database
            const { error: updateError } = await supabase
                .from('player_documents')
                .update({ is_active: false })
                .eq('id', id);

            if (updateError) {
                console.error('[VERCEL] Error deleting document:', updateError);
                return res.status(500).json({ error: 'Failed to delete document' });
            }

            return res.status(200).json({ message: 'Document deleted successfully' });

        } catch (error: any) {
            console.error('[VERCEL] Delete document error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
