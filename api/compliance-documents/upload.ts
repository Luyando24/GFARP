import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false, // Disallow body parsing for file uploads
    },
    maxDuration: 60,
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

        // Parse form data
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
        });

        const parseForm = (): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
            return new Promise((resolve, reject) => {
                form.parse(req as any, (err, fields, files) => {
                    if (err) reject(err);
                    resolve({ fields, files });
                });
            });
        };

        const { fields, files } = await parseForm();

        // Extract form data
        const academyId = Array.isArray(fields.academyId) ? fields.academyId[0] : fields.academyId;
        const documentName = Array.isArray(fields.document_name) ? fields.document_name[0] : fields.document_name;
        const documentType = Array.isArray(fields.document_type) ? fields.document_type[0] : fields.document_type;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
        const expiryDate = Array.isArray(fields.expiry_date) ? fields.expiry_date[0] : fields.expiry_date;

        // Get uploaded file
        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!academyId || !documentName || !documentType || !file) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: academyId, document_name, document_type, file'
            });
        }

        console.log(`[VERCEL] Uploading compliance document: ${documentName}`);

        // Generate unique filename
        const fileExtension = file.originalFilename?.split('.').pop() || 'pdf';
        const storedFilename = `${uuidv4()}.${fileExtension}`;
        const filePath = `${academyId}/${documentType}/${storedFilename}`;

        // Read file buffer
        const fileBuffer = fs.readFileSync(file.filepath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('compliance-documents')
            .upload(filePath, fileBuffer, {
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
        const documentId = uuidv4();
        const { data: insertData, error: insertError } = await supabase
            .from('fifa_compliance_documents')
            .insert({
                id: documentId,
                academy_id: academyId,
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
