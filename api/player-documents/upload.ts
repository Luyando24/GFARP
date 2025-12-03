
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export const config = {
    api: {
        bodyParser: false, // Disallow body parsing, consume as stream
    },
    maxDuration: 10,
};

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'application/pdf',
            'image/heic',
            'image/heif'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
    }
}).single('document');

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
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Run multer middleware
        await runMiddleware(req, res, upload);

        // Now we have req.file and req.body
        const file = (req as any).file;
        const { playerId, documentType } = (req as any).body;

        if (!file || !playerId || !documentType) {
            return res.status(400).json({
                error: 'Missing required fields: playerId, documentType, and file'
            });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error: Missing Supabase credentials');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check if player exists
        const { data: playerCheck, error: playerError } = await supabase
            .from('players')
            .select('id')
            .eq('id', playerId)
            .single();

        if (playerError || !playerCheck) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const storedFilename = `${uuidv4()}${fileExtension}`;
        const filePath = `player-documents/${playerId}/${documentType}/${storedFilename}`;

        // Check if bucket exists and create if not
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'player-documents');

        if (!bucketExists) {
            console.log('[VERCEL] Creating player-documents bucket...');
            const { error: createBucketError } = await supabase.storage.createBucket('player-documents', {
                public: true
            });
            if (createBucketError) {
                console.error('[VERCEL] Failed to create bucket:', createBucketError);
                // Continue anyway, maybe it exists but listing failed or race condition
            }
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('player-documents')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload file to storage' });
        }

        // Deactivate previous document of the same type
        await supabase
            .from('player_documents')
            .update({ is_active: false })
            .eq('player_id', playerId)
            .eq('document_type', documentType)
            .eq('is_active', true);

        // Store document metadata in database
        const { data: document, error: insertError } = await supabase
            .from('player_documents')
            .insert({
                player_id: playerId,
                document_type: documentType,
                original_filename: file.originalname,
                stored_filename: storedFilename,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.mimetype,
                uploaded_by: null, // Can't easily get user ID in this context without token parsing
                is_active: true,
                upload_date: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('Database insert error:', insertError);
            return res.status(500).json({ error: 'Failed to save document metadata' });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('player-documents')
            .getPublicUrl(filePath);

        return res.status(201).json({
            message: 'Document uploaded successfully',
            document: {
                id: document.id,
                document_type: document.document_type,
                original_filename: document.original_filename,
                file_size: document.file_size,
                mime_type: document.mime_type,
                uploaded_at: document.upload_date,
                file_url: urlData.publicUrl
            }
        });

    } catch (error: any) {
        console.error('Upload handler error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
}
