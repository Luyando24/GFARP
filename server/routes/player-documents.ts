import type { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { query } from '../lib/db.js';

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
      'image/heic',
      'image/heif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

// Document type validation
const VALID_DOCUMENT_TYPES = ['passport_id', 'player_photo', 'proof_of_training', 'birth_certificate'];

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

    // Deactivate previous document of the same type (for versioning)
    await query(
      'UPDATE player_documents SET is_active = false WHERE player_id = $1 AND document_type = $2 AND is_active = true',
      [playerId, documentType]
    );

    // Store document metadata in database
    const insertResult = await query(`
      INSERT INTO player_documents (
        player_id, document_type, original_filename, stored_filename, 
        file_path, file_size, mime_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, upload_date
    `, [
      playerId,
      documentType,
      file.originalname,
      storedFilename,
      filePath,
      file.size,
      file.mimetype,
      (req as any).user?.id || null
    ]);

    const document = insertResult.rows[0];

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('player-documents')
      .getPublicUrl(filePath);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        documentType,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadDate: document.upload_date,
        url: urlData.publicUrl
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

    // Get all active documents for the player
    const result = await query(`
      SELECT 
        id,
        document_type,
        original_filename,
        file_path,
        file_size,
        mime_type,
        upload_date,
        uploaded_by
      FROM player_documents 
      WHERE player_id = $1 AND is_active = true
      ORDER BY document_type, upload_date DESC
    `, [playerId]);

    const documents = result.rows.map(doc => {
      // Get public URL for each document
      const { data: urlData } = supabase.storage
        .from('player-documents')
        .getPublicUrl(doc.file_path);

      return {
        id: doc.id,
        documentType: doc.document_type,
        originalFilename: doc.original_filename,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadDate: doc.upload_date,
        uploadedBy: doc.uploaded_by,
        url: urlData.publicUrl
      };
    });

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
      'SELECT file_path FROM player_documents WHERE id = $1 AND is_active = true',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
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