
import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// Interface definitions
interface FinancialTransaction {
  id?: number;
  academy_id: string;
  transaction_type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  transaction_date: string;
  payment_method?: string;
  reference_number?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  created_by?: string;
}

interface BudgetCategory {
  id?: number;
  academy_id: string;
  category_name: string;
  category_type: 'revenue' | 'expense';
  budgeted_amount: number;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  fiscal_year: number;
  is_active: boolean;
}

// --- Handlers ---

// GET /api/financial-transactions/:academyId/summary
const handleGetSummary: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    
    // 1. Get total revenue and expenses from Financial Transactions
    const summaryResult = await query(`
      SELECT 
        transaction_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE academy_id = $1 AND status = 'completed'
      GROUP BY transaction_type
    `, [academyId]);

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalTransactions = 0;

    summaryResult.rows.forEach((row: any) => {
      const rawAmount = row.total_amount;
      // Handle potential string formatting (e.g. if money type)
      const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/[^0-9.-]+/g,"")) : Number(rawAmount);
      const count = Number(row.transaction_count);
      
      if (row.transaction_type === 'income') {
        totalRevenue += amount;
      } else {
        totalExpenses += amount;
      }
      totalTransactions += count;
    });

    // 2. Get revenue from Transfers that are NOT yet in financial_transactions
    // This ensures we show transfer data even if the sync hasn't happened
    const transferResult = await query(`
      SELECT 
        SUM(transfer_amount) as total_amount,
        COUNT(*) as count
      FROM transfers t
      WHERE 
        t.academy_id = $1 
        AND t.status = 'completed' 
        AND t.transfer_amount > 0
        AND NOT EXISTS (
          SELECT 1 FROM financial_transactions ft 
          WHERE ft.reference_number = 'TRF-' || t.id::text
        )
    `, [academyId]);

    if (transferResult.rows.length > 0) {
      const transferRow = transferResult.rows[0];
      const rawTransferAmount = transferRow.total_amount;
      const transferAmount = typeof rawTransferAmount === 'string' ? parseFloat(rawTransferAmount.replace(/[^0-9.-]+/g,"")) : Number(rawTransferAmount || 0);
      const transferCount = Number(transferRow.count || 0);

      // Assuming transfers are income
      totalRevenue += transferAmount;
      totalTransactions += transferCount;
    }

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 
      ? ((netProfit / totalRevenue) * 100).toFixed(1) 
      : '0';

    // 3. Category Breakdown (combine transactions and transfers)
    const categoryResult = await query(`
      SELECT category, transaction_type, SUM(amount) as total_amount, COUNT(*) as transaction_count FROM (
        SELECT transaction_type, category, amount
        FROM financial_transactions
        WHERE academy_id = $1 AND status = 'completed'
        
        UNION ALL
        
        SELECT 
          'income' as transaction_type, 
          'Transfer Fees' as category, 
          transfer_amount as amount
        FROM transfers t
        WHERE 
          t.academy_id = $1 
          AND t.status = 'completed' 
          AND t.transfer_amount > 0
          AND NOT EXISTS (
            SELECT 1 FROM financial_transactions ft 
            WHERE ft.reference_number = 'TRF-' || t.id::text
          )
      ) as combined
      GROUP BY transaction_type, category
      ORDER BY total_amount DESC
    `, [academyId]);

    // 4. Monthly Breakdown
    const monthlyResult = await query(`
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        transaction_type,
        SUM(amount) as total_amount
      FROM (
        SELECT transaction_date, transaction_type, amount
        FROM financial_transactions
        WHERE 
          academy_id = $1 
          AND status = 'completed'
          AND EXTRACT(YEAR FROM transaction_date) = $2
          
        UNION ALL
        
        SELECT 
          transfer_date as transaction_date,
          'income' as transaction_type,
          transfer_amount as amount
        FROM transfers t
        WHERE 
          t.academy_id = $1 
          AND t.status = 'completed' 
          AND t.transfer_amount > 0
          AND EXTRACT(YEAR FROM t.transfer_date) = $2
          AND NOT EXISTS (
            SELECT 1 FROM financial_transactions ft 
            WHERE ft.reference_number = 'TRF-' || t.id::text
          )
      ) as combined
      GROUP BY month, transaction_type
      ORDER BY month
    `, [academyId, year]);

    const monthlyBreakdown = monthlyResult.rows.map((row: any) => ({
      month: Number(row.month),
      transaction_type: row.transaction_type,
      total_amount: row.total_amount
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          totalTransactions
        },
        categoryBreakdown: categoryResult.rows,
        monthlyBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch financial summary' });
  }
};

// GET /api/financial-transactions/:academyId/budget-categories
const handleGetBudgetCategories: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const result = await query(`
      SELECT * FROM budget_categories 
      WHERE academy_id = $1 AND fiscal_year = $2 AND is_active = true
      ORDER BY category_type, category_name
    `, [academyId, year]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch budget categories' });
  }
};

// POST /api/financial-transactions/:academyId/budget-categories
const handleCreateBudgetCategory: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const category: BudgetCategory = req.body;

    // Basic validation
    if (!category.category_name || !category.budgeted_amount) {
        return res.status(400).json({ success: false, error: 'Category name and budgeted amount are required' });
    }

    const result = await query(`
      INSERT INTO budget_categories (
        academy_id, category_name, category_type, budgeted_amount,
        period_type, fiscal_year, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [
      academyId,
      category.category_name,
      category.category_type || 'expense', // Default to expense if missing
      category.budgeted_amount,
      category.period_type || 'monthly', // Default to monthly if missing
      category.fiscal_year || new Date().getFullYear() // Default to current year
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating budget category:', error);
    res.status(500).json({ success: false, error: `Failed to create budget category: ${error.message}` });
  }
};

// PUT /api/financial-transactions/budget-categories/:id
const handleUpdateBudgetCategory: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const category: Partial<BudgetCategory> = req.body;

    const result = await query(`
      UPDATE budget_categories
      SET
        category_name = COALESCE($1, category_name),
        category_type = COALESCE($2, category_type),
        budgeted_amount = COALESCE($3, budgeted_amount),
        period_type = COALESCE($4, period_type),
        fiscal_year = COALESCE($5, fiscal_year),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      category.category_name,
      category.category_type,
      category.budgeted_amount,
      category.period_type,
      category.fiscal_year,
      category.is_active,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Budget category not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating budget category:', error);
    res.status(500).json({ success: false, error: 'Failed to update budget category' });
  }
};

// DELETE /api/financial-transactions/budget-categories/:id
const handleDeleteBudgetCategory: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete
    const result = await query(`
      UPDATE budget_categories SET is_active = false WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Budget category not found' });
    }

    res.json({ success: true, message: 'Budget category deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete budget category' });
  }
};

// GET /api/financial-transactions/:academyId
const handleGetTransactions: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const {
      page = 1,
      limit = 50,
      type,
      category,
      status,
      dateFrom,
      dateTo,
      search
    } = req.query;

    let whereConditions = ['academy_id = $1'];
    let queryParams: any[] = [academyId];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`transaction_type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`transaction_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`transaction_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(description ILIKE $${paramIndex} OR reference_number ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM financial_transactions 
      WHERE ${whereConditions.join(' AND ')}
    `;

    const dataQuery = `
      SELECT *
      FROM financial_transactions 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Number(limit), offset);

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, queryParams.slice(0, -2)),
      query(dataQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        transactions: dataResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching financial transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch financial transactions' });
  }
};

// POST /api/financial-transactions
const handleCreateTransaction: RequestHandler = async (req, res) => {
  try {
    const transaction: FinancialTransaction = req.body;

    const result = await query(`
      INSERT INTO financial_transactions (
        academy_id, transaction_type, category, subcategory, amount, 
        description, transaction_date, payment_method, reference_number, 
        status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      transaction.academy_id,
      transaction.transaction_type,
      transaction.category,
      transaction.subcategory,
      transaction.amount,
      transaction.description,
      transaction.transaction_date,
      transaction.payment_method,
      transaction.reference_number,
      transaction.status || 'completed',
      transaction.notes,
      transaction.created_by
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating financial transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to create financial transaction' });
  }
};

// PUT /api/financial-transactions/:id
const handleUpdateTransaction: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Update Transaction Request:', { id, body: req.body });
    const transaction: Partial<FinancialTransaction> = req.body;

    const result = await query(`
      UPDATE financial_transactions 
      SET 
        transaction_type = COALESCE($1, transaction_type),
        category = COALESCE($2, category),
        subcategory = COALESCE($3, subcategory),
        amount = COALESCE($4, amount),
        description = COALESCE($5, description),
        transaction_date = COALESCE($6, transaction_date),
        payment_method = COALESCE($7, payment_method),
        reference_number = COALESCE($8, reference_number),
        status = COALESCE($9, status),
        notes = COALESCE($10, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      transaction.transaction_type,
      transaction.category,
      transaction.subcategory,
      transaction.amount,
      transaction.description,
      transaction.transaction_date,
      transaction.payment_method,
      transaction.reference_number,
      transaction.status,
      transaction.notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating financial transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to update financial transaction' });
  }
};

// DELETE /api/financial-transactions/:id
const handleDeleteTransaction: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM financial_transactions WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting financial transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to delete financial transaction' });
  }
};

// --- Route Definitions ---

// Budget Categories
// Put this second to ensure it's matched before :academyId
router.get('/:academyId/budget-categories', handleGetBudgetCategories);
router.post('/:academyId/budget-categories', handleCreateBudgetCategory);
router.put('/budget-categories/:id', handleUpdateBudgetCategory);
router.delete('/budget-categories/:id', handleDeleteBudgetCategory);

// Transactions
router.post('/', handleCreateTransaction);
router.put('/:id', handleUpdateTransaction);
router.delete('/:id', handleDeleteTransaction);
router.get('/:academyId/summary', handleGetSummary);
router.get('/:academyId', handleGetTransactions);

export default router;
