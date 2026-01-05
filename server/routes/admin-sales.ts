import { Router } from 'express';
import { query, transaction } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper to determine academy ID type
async function getAcademiesIdType(): Promise<'uuid' | 'integer'> {
  try {
    const res = await query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'academies' AND column_name = 'id'
    `);
    const t = res.rows[0]?.data_type?.toLowerCase();
    if (t === 'integer' || t === 'bigint') return 'integer';
    return 'uuid';
  } catch (err) {
    console.error('Error determining academy ID type:', err);
    return 'uuid'; // Default to UUID if check fails
  }
}

// Setup/Init Tables
router.post('/setup', async (req, res) => {
  try {
    console.log('🚀 Initializing Sales Agents module...');

    // 1. Create sales_agents table
    await query(`
      CREATE TABLE IF NOT EXISTS sales_agents (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        code VARCHAR(50) UNIQUE,
        commission_rate DECIMAL(5,2) DEFAULT 10.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ sales_agents table ready');

    // 2. Add sales_agent_id to academies if not exists
    await query(`
      ALTER TABLE academies 
      ADD COLUMN IF NOT EXISTS sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE SET NULL;
    `);
    console.log('✅ academies table updated');

    // 3. Create commissions table
    // Need to know academy ID type for FK
    const academyIdType = await getAcademiesIdType();
    const academyIdTypeSQL = academyIdType === 'integer' ? 'INTEGER' : 'UUID';

    await query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id UUID PRIMARY KEY,
        sales_agent_id UUID REFERENCES sales_agents(id) ON DELETE CASCADE,
        academy_id ${academyIdTypeSQL} REFERENCES academies(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
        paid_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ commissions table ready');

    res.json({ success: true, message: 'Sales Agents module initialized successfully' });
  } catch (error) {
    console.error('Error setting up sales agents module:', error);
    res.status(500).json({ success: false, message: 'Setup failed', error: String(error) });
  }
});

// LIST Agents
router.get('/', async (req, res) => {
  try {
    // Get agents with basic stats
    // We count academies linked to them
    const result = await query(`
      SELECT 
        sa.*,
        COUNT(a.id) as total_academies,
        COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid'), 0) as total_paid,
        COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'pending'), 0) as total_pending
      FROM sales_agents sa
      LEFT JOIN academies a ON sa.id = a.sales_agent_id
      LEFT JOIN commissions c ON sa.id = c.sales_agent_id
      GROUP BY sa.id
      ORDER BY sa.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching sales agents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agents' });
  }
});

// CREATE Agent
router.post('/', async (req, res) => {
  const { name, email, phone, code, commission_rate } = req.body;
  if (!name || !email || !code) {
    return res.status(400).json({ success: false, message: 'Name, Email and Code are required' });
  }

  try {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO sales_agents (id, name, email, phone, code, commission_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name, email, phone, code, commission_rate || 10.0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating sales agent:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, message: 'Email or Code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create agent' });
  }
});

// UPDATE Agent
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, code, commission_rate, status } = req.body;

  try {
    const result = await query(
      `UPDATE sales_agents 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           code = COALESCE($4, code),
           commission_rate = COALESCE($5, commission_rate),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, email, phone, code, commission_rate, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating sales agent:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email or Code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update agent' });
  }
});

// DELETE Agent
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if agent has linked academies or commissions
    // If so, maybe soft delete or block? 
    // For now, we allow delete if no dependencies, or cascading handled by DB?
    // DB defines: academies -> SET NULL, commissions -> CASCADE.
    // So deleting agent keeps academies (unlinked) but deletes commission records.
    
    await query('DELETE FROM sales_agents WHERE id = $1', [id]);
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting sales agent:', error);
    res.status(500).json({ success: false, message: 'Failed to delete agent' });
  }
});

// GET Agent Details (including linked academies)
router.get('/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    const agentRes = await query('SELECT * FROM sales_agents WHERE id = $1', [id]);
    if (agentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    const academiesRes = await query(`
      SELECT id, name, email, created_at, status 
      FROM academies 
      WHERE sales_agent_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    const commissionsRes = await query(`
      SELECT * FROM commissions WHERE sales_agent_id = $1 ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        agent: agentRes.rows[0],
        academies: academiesRes.rows,
        commissions: commissionsRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch details' });
  }
});

// Calculate/Generate Commission for an Academy Sign-up (Internal or Admin Triggered)
// This might be automated via webhooks later, but for now admin might manually add commission?
// Or we can assume commissions are auto-generated when subscription is paid.
// Let's add a route to manually add a commission record if needed.
router.post('/:id/commissions', async (req, res) => {
  const { id } = req.params;
  const { academy_id, amount, status, notes } = req.body;
  
  try {
    const commId = uuidv4();
    const result = await query(
      `INSERT INTO commissions (id, sales_agent_id, academy_id, amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [commId, id, academy_id, amount, status || 'pending', notes]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding commission:', error);
    res.status(500).json({ success: false, message: 'Failed to add commission' });
  }
});

export default router;
