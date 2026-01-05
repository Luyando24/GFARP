import { Router } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// LIST Promo Codes
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo codes' });
  }
});

// CREATE Promo Code
router.post('/', async (req, res) => {
  const { code, discount_percent, status, expires_at, max_uses } = req.body;
  
  if (!code || !discount_percent) {
    return res.status(400).json({ success: false, message: 'Code and Discount Percentage are required' });
  }

  try {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO promo_codes (id, code, discount_percent, status, expires_at, max_uses)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, code.toUpperCase(), discount_percent, status || 'active', expires_at || null, max_uses || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create promo code' });
  }
});

// UPDATE Promo Code
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { code, discount_percent, status, expires_at, max_uses } = req.body;

  try {
    const result = await query(
      `UPDATE promo_codes 
       SET code = COALESCE($1, code),
           discount_percent = COALESCE($2, discount_percent),
           status = COALESCE($3, status),
           expires_at = $4,
           max_uses = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [code ? code.toUpperCase() : null, discount_percent, status, expires_at, max_uses, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update promo code' });
  }
});

// DELETE Promo Code
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM promo_codes WHERE id = $1', [id]);
    res.json({ success: true, message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo code' });
  }
});

// VALIDATE Promo Code (Public/Academy)
router.post('/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Promo code is required' });
  }

  try {
    const result = await query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR used_count < max_uses)`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired promo code' });
    }

    const promo = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        code: promo.code,
        discount_percent: parseFloat(promo.discount_percent),
        id: promo.id
      } 
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({ success: false, message: 'Validation failed' });
  }
});

export default router;
