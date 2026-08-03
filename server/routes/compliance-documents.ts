import { Router } from 'express';
import { query } from '../lib/db.js';
import { uploadMiddleware } from './player-documents.js';
import { supabase } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { authenticateToken, canAccessOrganizationForRequest, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all compliance routes
router.use(authenticateToken);

// GET /api/compliance-documents?academyId=...
router.get('/', async (req, res) => {
  try {
    const { academyId } = req.query;

    if (!academyId) {
      return res.status(400).json({ success: false, message: 'Academy ID is required or session is invalid' });
    }
    if (!(await canAccessOrganizationForRequest(req.user, academyId))) {
      return res.status(403).json({ success: false, message: 'You cannot access this organization' });
    }

    // Check if organization exists first (either academy or agency) to avoid FK violations
    const academyCheck = await query('SELECT id FROM academies WHERE id = $1', [academyId as string]);
    const agencyCheck = academyCheck.rows.length === 0 
        ? await query('SELECT id FROM agencies WHERE id = $1', [academyId as string])
        : { rows: [] };

    if (academyCheck.rows.length === 0 && agencyCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `Organization with ID ${academyId} not found. Please log out and log in again.` 
      });
    }


    // Find/Create compliance record
    let complianceId;
    try {
      const complianceResult = await query(
        `SELECT id FROM fifa_compliance WHERE academy_id = $1 AND compliance_type = 'general' LIMIT 1`,
        [academyId as string]
      );
      
      if (complianceResult.rows.length > 0) {
        complianceId = complianceResult.rows[0].id;
      } else {
        // Create default compliance record
        console.log(`Creating default compliance record for academy: ${academyId}`);
        const newComp = await query(
          `INSERT INTO fifa_compliance (academy_id, compliance_type, title, description, status)
           VALUES ($1, 'general', 'General FIFA Compliance', 'Standard compliance requirements', 'pending')
           RETURNING id`,
          [academyId as string]
        );
        complianceId = newComp.rows[0].id;
      }
    } catch (dbError) {
      console.error('Database error in compliance-documents GET:', dbError);
      return res.status(500).json({ success: false, message: 'Database error', details: (dbError as Error).message });
    }

    const result = await query(
      `SELECT * FROM fifa_compliance_documents WHERE compliance_id = $1 ORDER BY upload_date DESC`,
      [complianceId]
    );
    
    const documents = await Promise.all(result.rows.map(async doc => {
      const { data } = await supabase.storage.from('compliance-documents').createSignedUrl(doc.file_path, 15 * 60);
      return { ...doc, fileUrl: data?.signedUrl || '' };
    }));

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching compliance documents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents', error: (error as Error).message });
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
    if (!(await canAccessOrganizationForRequest(req.user, academyId))) {
      return res.status(403).json({ success: false, message: 'You cannot upload for this organization' });
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
        academyId, // academyId is a valid UUID
        expiry_date || null,
        description || ''
      ]
    );
    
    const { data: urlData } = await supabase.storage
        .from('compliance-documents')
        .createSignedUrl(filePath, 15 * 60);

    res.json({ success: true, data: { ...result.rows[0], fileUrl: urlData?.signedUrl || '' } });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// POST /api/compliance-documents/update-status
router.post('/update-status', requireAdmin, async (req, res) => {
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
router.post('/delete', requireAdmin, async (req, res) => {
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
        const owner = await query(`
          SELECT fc.academy_id, fcd.file_path
          FROM fifa_compliance_documents fcd
          JOIN fifa_compliance fc ON fc.id = fcd.compliance_id
          WHERE fcd.id = $1
        `, [id]);
        if (!owner.rows.length) return res.status(404).json({ success: false, message: 'Document not found' });
        if (!(await canAccessOrganizationForRequest(req.user, owner.rows[0].academy_id))) {
          return res.status(403).json({ success: false, message: 'You cannot delete this document' });
        }
        const result = await query('DELETE FROM fifa_compliance_documents WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found' });
        if (owner.rows[0].file_path) await supabase.storage.from('compliance-documents').remove([owner.rows[0].file_path]);
        
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting document' });
    }
});

// GET /api/compliance-documents/admin-list - List all compliance documents for admin review
router.get('/admin-list', requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT fcd.*, a.name as academy_name, fc.academy_id
            FROM fifa_compliance_documents fcd
            JOIN fifa_compliance fc ON fcd.compliance_id = fc.id
            JOIN academies a ON fc.academy_id = a.id
            ORDER BY fcd.upload_date DESC
        `);
        
        // Transform result to include public URL
        const documents = await Promise.all(result.rows.map(async doc => {
          const { data } = await supabase.storage.from('compliance-documents').createSignedUrl(doc.file_path, 15 * 60);
          return { ...doc, fileUrl: data?.signedUrl || '' };
        }));

        res.json({ success: true, data: documents });
    } catch (error) {
        console.error('Error fetching admin compliance list:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
});

// GET /api/compliance-documents/stats - Get compliance statistics for admin dashboard
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_documents,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
            FROM fifa_compliance_documents
        `);
        
        const academyStats = await query(`
            SELECT 
                COUNT(DISTINCT academy_id) as total_academies,
                COUNT(DISTINCT academy_id) FILTER (WHERE status = 'verified') as compliant_academies
            FROM fifa_compliance
        `);

        res.json({ 
            success: true, 
            data: {
                ...stats.rows[0],
                ...academyStats.rows[0]
            }
        });
    } catch (error) {
        console.error('Error fetching compliance stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

export default router;
