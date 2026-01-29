import { Router } from 'express';
import { query } from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Middleware to check if user is admin or superadmin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin only.' });
  }
};

// Get all exemptions
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM exempted_emails ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching exemptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add an exemption
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, module, reason } = req.body;
    if (!email || !module) {
      return res.status(400).json({ error: 'Email and module are required' });
    }

    await query(
      'INSERT INTO exempted_emails (email, module, reason) VALUES ($1, $2, $3) ON CONFLICT (email, module) DO UPDATE SET reason = $3',
      [email, module, reason]
    );

    res.json({ success: true, message: 'Exemption added successfully' });
  } catch (error) {
    console.error('Error adding exemption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an exemption
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM exempted_emails WHERE id = $1', [id]);
    res.json({ success: true, message: 'Exemption removed successfully' });
  } catch (error) {
    console.error('Error removing exemption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
