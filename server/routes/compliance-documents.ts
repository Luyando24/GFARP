import { Router } from 'express';
import { query } from '../lib/db.js';
import { uploadMiddleware } from './player-documents.js';
import { supabase } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

// GET /api/compliance-documents?academyId=...
router.get('/', async (req, res) => {
  try {
    const { academyId } = req.query;

    if (!academyId) {
      return res.status(400).json({ success: false, message: 'Academy ID is required' });
    }

    // Find/Create compliance record
    let complianceId;
    const complianceResult = await query(
      `SELECT id FROM fifa_compliance WHERE academy_id = $1 AND compliance_type = 'general' LIMIT 1`,
      [academyId]
    );
    
    if (complianceResult.rows.length > 0) {
      complianceId = complianceResult.rows[0].id;
    } else {
      // Create default compliance record
      const newComp = await query(
        `INSERT INTO fifa_compliance (academy_id, compliance_type, title, description, status)
         VALUES ($1, 'general', 'General FIFA Compliance', 'Standard compliance requirements', 'pending')
         RETURNING id`,
        [academyId]
      );
      complianceId = newComp.rows[0].id;
    }

    const result = await query(
      `SELECT * FROM fifa_compliance_documents WHERE compliance_id = $1 ORDER BY upload_date DESC`,
      [complianceId]
    );
    
    // Transform result to include public URL
    const documents = result.rows.map(doc => {
        const { data: urlData } = supabase.storage
            .from('compliance-documents')
            .getPublicUrl(doc.file_path);
        
        return {
            ...doc,
            fileUrl: urlData.publicUrl
        };
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching compliance documents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// POST /api/compliance-documents/upload
router.post('/upload', uploadMiddleware, async (req, res) => {
  try {
    const { academyId, document_name, document_type, description, expiry_date } = req.body;
    const file = req.file;

    if (!file || !academyId || !document_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Find/Create compliance record
    let complianceId;
    const complianceResult = await query(
      `SELECT id FROM fifa_compliance WHERE academy_id = $1 AND compliance_type = 'general' LIMIT 1`,
      [academyId]
    );
    
    if (complianceResult.rows.length > 0) {
      complianceId = complianceResult.rows[0].id;
    } else {
      const newComp = await query(
        `INSERT INTO fifa_compliance (academy_id, compliance_type, title, description, status)
         VALUES ($1, 'general', 'General FIFA Compliance', 'Standard compliance requirements', 'pending')
         RETURNING id`,
        [academyId]
      );
      complianceId = newComp.rows[0].id;
    }

    // Generate unique filename and path
    const fileExtension = path.extname(file.originalname);
    const storedFilename = `${uuidv4()}${fileExtension}`;
    const filePath = `${academyId}/${storedFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('compliance-documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        // If bucket doesn't exist, try to create it (optional, usually setup manually)
        // For now, assume bucket exists or fail.
        return res.status(500).json({ success: false, message: 'Failed to upload file to storage' });
    }

    const result = await query(
      `INSERT INTO fifa_compliance_documents (
        compliance_id, document_name, document_type, file_path, file_size, 
        mime_type, uploaded_by, expiry_date, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
      RETURNING *`,
      [
        complianceId, 
        document_name, 
        document_type, 
        filePath, 
        file.size, 
        file.mimetype, 
        'academy_admin', 
        expiry_date || null,
        description || ''
      ]
    );
    
    // Get public URL
    const { data: urlData } = supabase.storage
        .from('compliance-documents')
        .getPublicUrl(filePath);

    res.json({ success: true, data: { ...result.rows[0], fileUrl: urlData.publicUrl } });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// POST /api/compliance-documents/update-status
router.post('/update-status', async (req, res) => {
  try {
    const { documentId, status, rejectionReason } = req.body;

    if (!documentId || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await query(
      `UPDATE fifa_compliance_documents 
       SET status = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, rejectionReason || null, documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Recalculate compliance score for the associated academy?
    // We can trigger a recalculation here or do it on fetch.
    // For now, let's just update the document.

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating document status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// DELETE /api/compliance-documents/delete
router.post('/delete', async (req, res) => {
    try {
        const { documentId } = req.body;
        if (!documentId) return res.status(400).json({ success: false, message: 'Document ID required' });
        
        // Get file path first
        const docResult = await query('SELECT file_path FROM fifa_compliance_documents WHERE id = $1', [documentId]);
        
        if (docResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const filePath = docResult.rows[0].file_path;

        // Delete from DB
        const result = await query('DELETE FROM fifa_compliance_documents WHERE id = $1 RETURNING *', [documentId]);
        
        // Delete from Supabase Storage
        if (filePath) {
            const { error } = await supabase.storage
                .from('compliance-documents')
                .remove([filePath]);
            
            if (error) {
                console.error('Error deleting file from Supabase:', error);
                // We don't fail the request if file delete fails, as DB record is gone
            }
        }

        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ success: false, message: 'Error deleting document' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM fifa_compliance_documents WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found' });
        
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting document' });
    }
});

export default router;
