import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

export const config = {
    api: {
        bodyParser: false, // Disallow body parsing for file uploads (only works in Next.js, but good practice)
    },
    maxDuration: 60,
};

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// Helper to run middleware
function runMiddleware(req: any, res: any, fn: any) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

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

        // Run multer middleware
        await runMiddleware(req, res, upload.single('file'));

        // Extract form data from req.body (populated by multer)
        const body = (req as any).body || {};
        const file = (req as any).file;

        const academyId = body.academyId;
        const documentName = body.document_name;
        const documentType = body.document_type;
        const description = body.description;
        const expiryDate = body.expiry_date;

        if (!academyId || !documentName || !documentType || !file) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: academyId, document_name, document_type, file'
            });
        }

        console.log(`[VERCEL] Uploading compliance document: ${documentName}`);

        // Generate unique filename
        const fileExtension = file.originalname?.split('.').pop() || 'pdf';
        const storedFilename = `${uuidv4()}.${fileExtension}`;
        const filePath = `${academyId}/${documentType}/${storedFilename}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('compliance-documents')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype || 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            console.error('[VERCEL] Supabase upload error:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file to storage',
                error: uploadError.message
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('compliance-documents')
            .getPublicUrl(filePath);

        // Insert document metadata to database
        // Note: The table schema likely uses 'user_id' instead of 'academy_id' based on previous errors
        const documentId = uuidv4();
        const { data: insertData, error: insertError } = await supabase
            .from('fifa_compliance_documents')
            .insert({
                id: documentId,
                user_id: academyId, // Map academyId to user_id column
                document_name: documentName,
                document_type: documentType,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.mimetype || 'application/pdf',
                description: description || null,
                expiry_date: expiryDate || null,
                status: 'active',
                uploaded_by: 'Academy User', // TODO: Get from auth context
                uploaded_at: new Date().toISOString(),
                is_active: true
            })
            .select()
            .single();

        if (insertError) {
            console.error('[VERCEL] Database insert error:', insertError);
            // Try to delete uploaded file since DB insert failed
            await supabase.storage.from('compliance-documents').remove([filePath]);
            return res.status(500).json({
                success: false,
                message: 'Failed to save document metadata',
                error: insertError.message
            });
        }

        console.log('[VERCEL] Compliance document uploaded successfully');

        return res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                ...insertData,
                url: urlData.publicUrl
            }
        });

    } catch (error: any) {
        console.error('[VERCEL] Upload compliance document error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload document',
            error: error.message
        });
    }
}
