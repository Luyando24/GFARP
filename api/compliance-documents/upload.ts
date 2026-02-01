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

        // Check if bucket exists and create if not
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            const bucketExists = buckets?.some(b => b.name === 'compliance-documents');

            if (!bucketExists) {
                console.log('[VERCEL] Creating compliance-documents bucket...');
                const { error: createBucketError } = await supabase.storage.createBucket('compliance-documents', {
                    public: true,
                    fileSizeLimit: 10485760, // 10MB
                    allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
                });

                if (createBucketError) {
                    console.error('[VERCEL] Failed to create bucket:', createBucketError);
                    // Try to continue, maybe it was created by another process or listing failed
                } else {
                    console.log('[VERCEL] compliance-documents bucket created successfully');
                }
            }
        } catch (bucketCheckError) {
            console.warn('[VERCEL] Error checking/creating bucket:', bucketCheckError);
            // Continue anyway
        }

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

        // Validate academyId is not the string "undefined" or "null"
        if (academyId === 'undefined' || academyId === 'null') {
            return res.status(400).json({
                success: false,
                message: 'Invalid Academy ID'
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(academyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Academy ID format'
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

        // First create a compliance record if one doesn't exist (or use a default one)
        // But based on the schema, documents link to a compliance_id, NOT user_id directly.
        // We need to find or create a compliance record for this academy first.

        // Check for an existing general compliance record for this academy
        let complianceId;
        const { data: complianceRecord, error: complianceError } = await supabase
            .from('fifa_compliance')
            .select('id')
            .eq('academy_id', academyId)
            .eq('compliance_type', 'documentation_review')
            .limit(1)
            .single();

        if (complianceRecord) {
            complianceId = complianceRecord.id;
        } else {
            // Create a new compliance record
            const { data: newCompliance, error: createError } = await supabase
                .from('fifa_compliance')
                .insert({
                    academy_id: academyId,
                    compliance_type: 'documentation_review',
                    title: 'General Documentation',
                    description: 'Uploaded compliance documents',
                    status: 'pending'
                })
                .select('id')
                .single();

            if (createError) {
                console.error('[VERCEL] Failed to create compliance record:', createError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to initialize compliance record',
                    error: createError.message
                });
            }
            complianceId = newCompliance.id;
        }

        // Insert document metadata to database
        const documentId = uuidv4();
        const { data: insertData, error: insertError } = await supabase
            .from('fifa_compliance_documents')
            .insert({
                id: documentId,
                compliance_id: complianceId, // Link to compliance record, NOT user_id directly
                document_name: documentName,
                document_type: documentType,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.mimetype || 'application/pdf',
                // description: description || null, // Column does not exist in schema
                expiry_date: expiryDate || null,
                status: 'pending', // valid statuses: 'pending', 'verified', 'rejected', 'expired'
                // uploaded_by: 'Academy User', // UUID expected, cannot use string 'Academy User'
                upload_date: new Date().toISOString()
                // is_active: true // Column does not exist in schema
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
