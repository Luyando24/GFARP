
import { Router, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, canAccessOrganizationForRequest, normalizeRole, requireAdmin } from '../middleware/auth.js';
import { query } from '../lib/db.js';

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
        const folder = String(req.body.folder || 'general').replace(/[^a-z0-9/_-]/gi, '').replace(/\.\./g, '').slice(0, 120) || 'general';

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const BUCKET_NAME = 'public-uploads';

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

router.post('/', authenticateToken, requireAdmin, upload.single('file'), handleUpload);

router.post('/player/:playerId', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { playerId } = req.params;
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, error: 'No image uploaded' });

        let owner = await query('SELECT academy_id FROM players WHERE id = $1 LIMIT 1', [playerId]);
        if (!owner.rows.length) owner = await query('SELECT academy_id FROM individual_players WHERE id = $1 LIMIT 1', [playerId]);
        if (!owner.rows.length) return res.status(404).json({ success: false, error: 'Player not found' });
        const isSelf = normalizeRole(req.user?.role) === 'individual_player' && req.user?.id === playerId;
        if (!isSelf && !(await canAccessOrganizationForRequest(req.user, owner.rows[0].academy_id))) {
            return res.status(403).json({ success: false, error: 'You cannot upload an image for this player' });
        }

        const kind = String(req.body.kind || 'profile').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'profile';
        const fileName = `${kind}_${Date.now()}_${uuidv4()}.jpg`;
        const filePath = `players/${playerId}/${fileName}`;
        const { error } = await supabase.storage.from('public-uploads').upload(filePath, file.buffer, {
            contentType: 'image/jpeg', upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from('public-uploads').getPublicUrl(filePath);
        return res.json({ success: true, data: { url: data.publicUrl, fileName } });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message || 'Upload failed' });
    }
});

export default router;
