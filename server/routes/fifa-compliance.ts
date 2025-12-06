import { Router } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// GET /api/fifa-compliance - Get all compliance records for an academy
router.get('/', async (req, res) => {
  try {
    const { academy_id, status, compliance_type, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT fc.*, 
             a.name as academy_name,
             COUNT(fcd.id) as document_count,
             COUNT(fca.id) as action_count
      FROM fifa_compliance fc
      JOIN academies a ON fc.academy_id = a.id
      LEFT JOIN fifa_compliance_documents fcd ON fc.id = fcd.compliance_id
      LEFT JOIN fifa_compliance_actions fca ON fc.id = fca.compliance_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (academy_id) {
      sql += ` AND fc.academy_id = $${paramIndex}`;
      params.push(academy_id);
      paramIndex++;
    }

    if (status) {
      sql += ` AND fc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (compliance_type) {
      sql += ` AND fc.compliance_type = $${paramIndex}`;
      params.push(compliance_type);
      paramIndex++;
    }

    sql += `
      GROUP BY fc.id, a.name
      ORDER BY fc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching FIFA compliance records:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance records' });
  }
});

// GET /api/fifa-compliance/:id - Get specific compliance record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT fc.*,
             json_agg(DISTINCT fcd.*) FILTER (WHERE fcd.id IS NOT NULL) as documents,
             json_agg(DISTINCT fca.*) FILTER (WHERE fca.id IS NOT NULL) as actions,
             json_agg(DISTINCT fcc.*) FILTER (WHERE fcc.id IS NOT NULL) as comments
      FROM fifa_compliance fc
      LEFT JOIN fifa_compliance_documents fcd ON fc.id = fcd.compliance_id
      LEFT JOIN fifa_compliance_actions fca ON fc.id = fca.compliance_id
      LEFT JOIN fifa_compliance_comments fcc ON fc.id = fcc.compliance_id
      WHERE fc.id = $1
      GROUP BY fc.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching FIFA compliance record:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance record' });
  }
});

// POST /api/fifa-compliance - Create new compliance record
router.post('/', async (req, res) => {
  try {
    const {
      academy_id,
      compliance_type,
      title,
      description,
      status = 'pending',
      priority = 'medium',
      due_date,
      reviewer_id,
      reviewer_name
    } = req.body;

    if (!academy_id || !compliance_type || !title) {
      return res.status(400).json({ error: 'Missing required fields: academy_id, compliance_type, title' });
    }

    const result = await query(`
      INSERT INTO fifa_compliance (
        academy_id, compliance_type, title, description, status, priority, 
        due_date, reviewer_id, reviewer_name, submission_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [academy_id, compliance_type, title, description, status, priority, due_date, reviewer_id, reviewer_name]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating FIFA compliance record:', error);
    res.status(500).json({ error: 'Failed to create FIFA compliance record' });
  }
});

// PUT /api/fifa-compliance/:id - Update compliance record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      due_date,
      review_date,
      completion_date,
      reviewer_id,
      reviewer_name,
      reviewer_comments,
      compliance_score
    } = req.body;

    const result = await query(`
      UPDATE fifa_compliance SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        due_date = COALESCE($6, due_date),
        review_date = COALESCE($7, review_date),
        completion_date = COALESCE($8, completion_date),
        reviewer_id = COALESCE($9, reviewer_id),
        reviewer_name = COALESCE($10, reviewer_name),
        reviewer_comments = COALESCE($11, reviewer_comments),
        compliance_score = COALESCE($12, compliance_score),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, title, description, status, priority, due_date, review_date, completion_date, reviewer_id, reviewer_name, reviewer_comments, compliance_score]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating FIFA compliance record:', error);
    res.status(500).json({ error: 'Failed to update FIFA compliance record' });
  }
});

// DELETE /api/fifa-compliance/:id - Delete compliance record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM fifa_compliance WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ message: 'Compliance record deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting FIFA compliance record:', error);
    res.status(500).json({ error: 'Failed to delete FIFA compliance record' });
  }
});

// GET /api/fifa-compliance/areas/:academy_id - Get compliance areas for academy
router.get('/areas/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params;

    const result = await query(`
      SELECT * FROM fifa_compliance_areas 
      WHERE academy_id = $1 
      ORDER BY area_name
    `, [academy_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching FIFA compliance areas:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance areas' });
  }
});

// POST /api/fifa-compliance/areas - Create or update compliance area
router.post('/areas', async (req, res) => {
  try {
    const {
      academy_id,
      area_name,
      area_type,
      compliance_score = 0,
      status = 'pending',
      description
    } = req.body;

    if (!academy_id || !area_name || !area_type) {
      return res.status(400).json({ error: 'Missing required fields: academy_id, area_name, area_type' });
    }

    const result = await query(`
      INSERT INTO fifa_compliance_areas (
        academy_id, area_name, area_type, compliance_score, status, description, last_check_date
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (academy_id, area_type) 
      DO UPDATE SET
        area_name = EXCLUDED.area_name,
        compliance_score = EXCLUDED.compliance_score,
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        last_check_date = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [academy_id, area_name, area_type, compliance_score, status, description]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating FIFA compliance area:', error);
    res.status(500).json({ error: 'Failed to create/update FIFA compliance area' });
  }
});

// GET /api/fifa-compliance/documents/:compliance_id - Get documents for compliance record
router.get('/documents/:compliance_id', async (req, res) => {
  try {
    const { compliance_id } = req.params;

    const result = await query(`
      SELECT * FROM fifa_compliance_documents 
      WHERE compliance_id = $1 
      ORDER BY upload_date DESC
    `, [compliance_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching FIFA compliance documents:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance documents' });
  }
});

// POST /api/fifa-compliance/documents - Upload compliance document
router.post('/documents', async (req, res) => {
  try {
    const {
      compliance_id,
      document_name,
      document_type,
      file_path,
      file_size,
      mime_type,
      uploaded_by,
      expiry_date
    } = req.body;

    if (!compliance_id || !document_name || !document_type) {
      return res.status(400).json({ error: 'Missing required fields: compliance_id, document_name, document_type' });
    }

    const result = await query(`
      INSERT INTO fifa_compliance_documents (
        compliance_id, document_name, document_type, file_path, file_size, 
        mime_type, uploaded_by, expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [compliance_id, document_name, document_type, file_path, file_size, mime_type, uploaded_by, expiry_date]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading FIFA compliance document:', error);
    res.status(500).json({ error: 'Failed to upload FIFA compliance document' });
  }
});

// PUT /api/fifa-compliance/documents/:id/status - Update document status
router.put('/documents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    // Validate status
    const validStatuses = ['pending', 'verified', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided' });
    }

    const result = await query(`
      UPDATE fifa_compliance_documents
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating FIFA compliance document status:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// GET /api/fifa-compliance/actions/:academy_id - Get action items for academy
router.get('/actions/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params;
    const { status, priority } = req.query;

    let sql = `
      SELECT fca.*, fc.title as compliance_title 
      FROM fifa_compliance_actions fca
      LEFT JOIN fifa_compliance fc ON fca.compliance_id = fc.id
      WHERE fca.academy_id = $1
    `;
    const params: any[] = [academy_id];
    let paramIndex = 2;

    if (status) {
      sql += ` AND fca.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      sql += ` AND fca.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    sql += ` ORDER BY fca.due_date ASC, fca.priority DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching FIFA compliance actions:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance actions' });
  }
});

// POST /api/fifa-compliance/actions - Create action item
router.post('/actions', async (req, res) => {
  try {
    const {
      compliance_id,
      academy_id,
      title,
      description,
      priority = 'medium',
      assigned_to,
      due_date
    } = req.body;

    if (!academy_id || !title) {
      return res.status(400).json({ error: 'Missing required fields: academy_id, title' });
    }

    const result = await query(`
      INSERT INTO fifa_compliance_actions (
        compliance_id, academy_id, title, description, priority, assigned_to, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [compliance_id, academy_id, title, description, priority, assigned_to, due_date]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating FIFA compliance action:', error);
    res.status(500).json({ error: 'Failed to create FIFA compliance action' });
  }
});

// PUT /api/fifa-compliance/actions/:id - Update action item
router.put('/actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, assigned_to, due_date, completion_date } = req.body;

    const result = await query(`
      UPDATE fifa_compliance_actions SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        due_date = COALESCE($7, due_date),
        completion_date = COALESCE($8, completion_date),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, title, description, priority, status, assigned_to, due_date, completion_date]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating FIFA compliance action:', error);
    res.status(500).json({ error: 'Failed to update FIFA compliance action' });
  }
});

// GET /api/fifa-compliance/audits/:academy_id - Get audit history for academy
router.get('/audits/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params;

    const result = await query(`
      SELECT * FROM fifa_compliance_audits 
      WHERE academy_id = $1 
      ORDER BY audit_date DESC
    `, [academy_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching FIFA compliance audits:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance audits' });
  }
});

// POST /api/fifa-compliance/audits - Create audit record
router.post('/audits', async (req, res) => {
  try {
    const {
      academy_id,
      audit_type,
      auditor_name,
      auditor_organization,
      overall_score,
      result,
      findings,
      recommendations,
      next_audit_date
    } = req.body;

    if (!academy_id || !audit_type || !auditor_name || !result) {
      return res.status(400).json({ error: 'Missing required fields: academy_id, audit_type, auditor_name, result' });
    }

    const result_query = await query(`
      INSERT INTO fifa_compliance_audits (
        academy_id, audit_type, auditor_name, auditor_organization, overall_score,
        result, findings, recommendations, next_audit_date, audit_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [academy_id, audit_type, auditor_name, auditor_organization, overall_score, result, findings, recommendations, next_audit_date]);

    res.status(201).json(result_query.rows[0]);
  } catch (error) {
    console.error('Error creating FIFA compliance audit:', error);
    res.status(500).json({ error: 'Failed to create FIFA compliance audit' });
  }
});

// POST /api/fifa-compliance/comments - Add comment to compliance record
router.post('/comments', async (req, res) => {
  try {
    const {
      compliance_id,
      author_id,
      author_name,
      author_type = 'academy_staff',
      comment_text,
      is_internal = false
    } = req.body;

    if (!compliance_id || !author_name || !comment_text) {
      return res.status(400).json({ error: 'Missing required fields: compliance_id, author_name, comment_text' });
    }

    const result = await query(`
      INSERT INTO fifa_compliance_comments (
        compliance_id, author_id, author_name, author_type, comment_text, is_internal
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [compliance_id, author_id, author_name, author_type, comment_text, is_internal]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding FIFA compliance comment:', error);
    res.status(500).json({ error: 'Failed to add FIFA compliance comment' });
  }
});

// GET /api/fifa-compliance/dashboard/:academy_id - Get compliance dashboard data
router.get('/dashboard/:academy_id', async (req, res) => {
  try {
    const { academy_id } = req.params;

    // Get overall compliance statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'flagged') as flagged_count,
        AVG(compliance_score) FILTER (WHERE compliance_score IS NOT NULL) as avg_score
      FROM fifa_compliance 
      WHERE academy_id = $1
    `, [academy_id]);

    // Get compliance areas summary
    const areasResult = await query(`
      SELECT area_type, compliance_score, status 
      FROM fifa_compliance_areas 
      WHERE academy_id = $1
    `, [academy_id]);

    // Get recent actions
    const actionsResult = await query(`
      SELECT * FROM fifa_compliance_actions 
      WHERE academy_id = $1 AND status != 'completed'
      ORDER BY due_date ASC 
      LIMIT 10
    `, [academy_id]);

    // Get latest audit
    const auditResult = await query(`
      SELECT * FROM fifa_compliance_audits 
      WHERE academy_id = $1 
      ORDER BY audit_date DESC 
      LIMIT 1
    `, [academy_id]);

    res.json({
      statistics: statsResult.rows[0],
      compliance_areas: areasResult.rows,
      pending_actions: actionsResult.rows,
      latest_audit: auditResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching FIFA compliance dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch FIFA compliance dashboard' });
  }
});

export default router;