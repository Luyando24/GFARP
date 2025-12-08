
import { Router, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    }
});

// Generic upload handler
const handleUpload: RequestHandler = async (req, res) => {
    try {
        const file = req.file;
        const { folder = 'general' } = req.body;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Ensure bucket exists
        const BUCKET_NAME = 'public-uploads';
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.find(b => b.name === BUCKET_NAME)) {
            await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        res.json({
            success: true,
            data: {
                url: urlData.publicUrl,
                fileName: fileName
            }
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message || 'Upload failed' });
    }
};

router.post('/', upload.single('file'), handleUpload);

export default router;
