import type { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { query, transaction } from '../lib/db.js';
import { canAccessOrganizationForRequest, normalizeRole } from '../middleware/auth.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types for player documents
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/heic',
      'image/heif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Document type validation
const VALID_DOCUMENT_TYPES = ['passport_id', 'player_photo', 'proof_of_training', 'birth_certificate'];

async function canAccessPlayer(req: any, playerId: string): Promise<boolean> {
  if (normalizeRole(req.user?.role) === 'individual_player' && req.user?.id === playerId) return true;
  let owner = await query('SELECT academy_id FROM players WHERE id = $1 LIMIT 1', [playerId]);
  if (!owner.rows.length) {
    owner = await query('SELECT academy_id FROM individual_players WHERE id = $1 LIMIT 1', [playerId]);
  }
  return owner.rows.length > 0 && canAccessOrganizationForRequest(req.user, owner.rows[0].academy_id);
}

/**
 * Upload a player document
 */
export const handleUploadPlayerDocument: RequestHandler = async (req, res) => {
  try {
    const { playerId, documentType } = req.body;
    const file = req.file;

    // Validation
    if (!playerId || !documentType || !file) {
      return res.status(400).json({
        error: 'Missing required fields: playerId, documentType, and file'
      });
    }

    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        error: `Invalid document type. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
      });
    }

    if (!(await canAccessPlayer(req, playerId))) {
      return res.status(403).json({ error: 'You cannot manage documents for this player' });
    }

    // Check if player exists
    const playerCheck = await query('SELECT id FROM players WHERE id = $1', [playerId]);
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const storedFilename = `${uuidv4()}${fileExtension}`;
    const filePath = `player-documents/${playerId}/${documentType}/${storedFilename}`;

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

    let document;
    try {
      document = await transaction(async (client) => {
        const insertResult = await client.query(`
          INSERT INTO player_documents (
            player_id, document_type, original_filename, stored_filename,
            file_path, file_size, mime_type, uploaded_by, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
          RETURNING id, upload_date
        `, [playerId, documentType, file.originalname, storedFilename, filePath, file.size, file.mimetype, req.user?.id || null]);
        await client.query(
          'UPDATE player_documents SET is_active = false WHERE player_id = $1 AND document_type = $2 AND is_active = true AND id <> $3',
          [playerId, documentType, insertResult.rows[0].id],
        );
        return insertResult.rows[0];
      });
    } catch (dbError) {
      await supabase.storage.from('player-documents').remove([filePath]);
      throw dbError;
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('player-documents')
      .createSignedUrl(filePath, 15 * 60);
    if (urlError) throw urlError;

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        documentType,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadDate: document.upload_date,
        url: urlData.signedUrl
      }
    });

  } catch (error) {
    console.error('Upload player document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get player documents
 */
export const handleGetPlayerDocuments: RequestHandler = async (req, res) => {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    if (!(await canAccessPlayer(req, playerId))) {
      return res.status(403).json({ error: 'You cannot view documents for this player' });
    }

    // Check if we should include inactive documents (history)
    const includeInactive = req.query.include_inactive === 'true';

    let queryText = `
      SELECT 
        id,
        document_type,
        original_filename,
        file_path,
        file_size,
        mime_type,
        upload_date,
        uploaded_by,
        is_active
      FROM player_documents 
      WHERE player_id = $1
    `;

    // Filter by active status unless specifically requested to include inactive
    if (!includeInactive) {
      queryText += ` AND is_active = true`;
    }

    queryText += ` ORDER BY document_type, upload_date DESC`;

    // Get documents for the player
    const result = await query(queryText, [playerId]);

    const documents = await Promise.all(result.rows.map(async doc => {
      const { data: urlData } = await supabase.storage
        .from('player-documents')
        .createSignedUrl(doc.file_path, 15 * 60);
      return {
        id: doc.id,
        documentType: doc.document_type,
        originalFilename: doc.original_filename,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadDate: doc.upload_date,
        uploadedBy: doc.uploaded_by,
        isActive: doc.is_active,
        url: urlData?.signedUrl || ''
      };
    }));

    res.json({ documents });

  } catch (error) {
    console.error('Get player documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a player document
 */
export const handleDeletePlayerDocument: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Get document info before deletion
    const docResult = await query(
      'SELECT file_path, player_id FROM player_documents WHERE id = $1 AND is_active = true',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!(await canAccessPlayer(req, docResult.rows[0].player_id))) {
      return res.status(403).json({ error: 'You cannot delete this document' });
    }

    const filePath = docResult.rows[0].file_path;

    // Soft delete in database (set is_active = false)
    await query(
      'UPDATE player_documents SET is_active = false, updated_at = NOW() WHERE id = $1',
      [documentId]
    );

    // Optionally delete from Supabase Storage (uncomment if you want hard delete)
    // const { error: deleteError } = await supabase.storage
    //   .from('player-documents')
    //   .remove([filePath]);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete player document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export multer middleware for use in routes
export const uploadMiddleware = upload.single('document');
