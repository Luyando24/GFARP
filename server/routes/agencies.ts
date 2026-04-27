import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// GET /api/agencies/:id - Get agency by ID
const handleGetAgencyById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM agencies WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agency not found'
      });
    }

    const agency = result.rows[0];

    res.json({
      success: true,
      data: {
        ...agency,
        directorName: agency.director_name,
        directorEmail: agency.director_email,
        directorPhone: agency.director_phone,
        foundedYear: agency.founded_year,
        isActive: agency.status === 'active'
      }
    });
  } catch (error) {
    console.error('Error fetching agency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agency'
    });
  }
};

// PUT /api/agencies/:id - Update agency
const handleUpdateAgency: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Check if agency exists
    const existingResult = await query(
      'SELECT * FROM agencies WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agency not found'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    const allowedFields = ['name', 'email', 'phone', 'address', 'website', 'bio', 'city', 'country', 'director_name', 'director_email', 'director_phone', 'founded_year'];
    
    // Map frontend camelCase to backend snake_case
    const fieldMap: Record<string, string> = {
      directorName: 'director_name',
      directorEmail: 'director_email',
      directorPhone: 'director_phone',
      foundedYear: 'founded_year'
    };

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount++}`);
        updateValues.push(data[field]);
      }
    }

    // Handle mapped fields
    for (const [frontendKey, backendKey] of Object.entries(fieldMap)) {
      if (data[frontendKey] !== undefined) {
        updateFields.push(`${backendKey} = $${paramCount++}`);
        updateValues.push(data[frontendKey]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE agencies 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const agency = result.rows[0];

    res.json({
      success: true,
      data: {
        ...agency,
        directorName: agency.director_name,
        directorEmail: agency.director_email,
        directorPhone: agency.director_phone,
        foundedYear: agency.founded_year,
        isActive: agency.status === 'active'
      }
    });
  } catch (error) {
    console.error('Error updating agency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agency'
    });
  }
};

router.get('/:id', handleGetAgencyById);
router.put('/:id', handleUpdateAgency);

export default router;
