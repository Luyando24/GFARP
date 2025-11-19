import { Router, RequestHandler } from 'express';
import { query } from '../lib/db';

const router = Router();

// Interface definitions
interface FinancialTransaction {
  id?: number;
  academy_id: string; // Changed from number to string for UUID support
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
  created_by?: string; // Changed from number to string for UUID support
}

interface BudgetCategory {
  id?: number;
  academy_id: string; // Changed from number to string for UUID support
  category_name: string;
  category_type: 'revenue' | 'expense';
  budgeted_amount: number;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  fiscal_year: number;
  is_active: boolean;
}

// GET /api/financial-transactions/:academyId - Get all transactions for an academy
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
      SELECT 
        id,
        academy_id,
        transaction_type,
        category,
        subcategory,
        amount,
        description,
        transaction_date,
        payment_method,
        reference_number,
        status,
        notes,
        created_at,
        updated_at
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial transactions'
    });
  }
};

router.get('/:academyId', handleGetTransactions);

// POST /api/financial-transactions - Create a new transaction
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
    res.status(500).json({
      success: false,
      error: 'Failed to create financial transaction'
    });
  }
};

router.post('/', handleCreateTransaction);

// PUT /api/financial-transactions/:id - Update a transaction
const handleUpdateTransaction: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
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
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating financial transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update financial transaction'
    });
  }
};

router.put('/:id', handleUpdateTransaction);

// DELETE /api/financial-transactions/:id - Delete a transaction
const handleDeleteTransaction: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM financial_transactions 
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting financial transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete financial transaction'
    });
  }
};

router.delete('/:id', handleDeleteTransaction);

// GET /api/financial-transactions/:academyId/summary - Get financial summary
const handleGetSummary: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    const resolvedYear = typeof year === 'string' ? Number(year) : Number(year);

    // Get total revenue and expenses
    const summaryResult = await query(`
      SELECT 
        transaction_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE academy_id = $1 
        AND status = 'completed'
        AND EXTRACT(YEAR FROM transaction_date) = $2
      GROUP BY transaction_type
    `, [academyId, resolvedYear]);

    // Get category breakdown
    const categoryResult = await query(`
      SELECT 
        transaction_type,
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE academy_id = $1 
        AND status = 'completed'
        AND EXTRACT(YEAR FROM transaction_date) = $2
      GROUP BY transaction_type, category
      ORDER BY total_amount DESC
    `, [academyId, resolvedYear]);

    // Get monthly breakdown
    const monthlyResult = await query(`
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        transaction_type,
        SUM(amount) as total_amount
      FROM financial_transactions 
      WHERE academy_id = $1 
        AND status = 'completed'
        AND EXTRACT(YEAR FROM transaction_date) = $2
      GROUP BY EXTRACT(MONTH FROM transaction_date), transaction_type
      ORDER BY month
    `, [academyId, resolvedYear]);

    const summary = summaryResult.rows.reduce((acc, row) => {
      acc[row.transaction_type] = {
        total: parseFloat(row.total_amount),
        count: parseInt(row.transaction_count)
      };
      return acc;
    }, { income: { total: 0, count: 0 }, expense: { total: 0, count: 0 } });

    const netProfit = summary.income.total - summary.expense.total;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: summary.income.total,
          totalExpenses: summary.expense.total,
          netProfit,
          profitMargin: summary.income.total > 0 ? ((netProfit / summary.income.total) * 100).toFixed(2) : 0,
          totalTransactions: summary.income.count + summary.expense.count
        },
        categoryBreakdown: categoryResult.rows,
        monthlyBreakdown: monthlyResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial summary'
    });
  }
};

router.get('/:academyId/summary', handleGetSummary);

// Budget Categories Routes

// GET /api/financial-transactions/:academyId/budget-categories - Get budget categories
const handleGetBudgetCategories: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const resolvedYear2 = typeof year === 'string' ? Number(year) : Number(year);

    const result = await query(`
      SELECT 
        bc.*,
        COALESCE(SUM(ft.amount), 0) as spent_amount,
        COALESCE(COUNT(ft.id), 0) as transaction_count
      FROM budget_categories bc
      LEFT JOIN financial_transactions ft ON (
        bc.academy_id = ft.academy_id 
        AND bc.category_name = ft.category 
        AND bc.category_type = ft.transaction_type
        AND EXTRACT(YEAR FROM ft.transaction_date) = bc.fiscal_year
        AND ft.status = 'completed'
      )
      WHERE bc.academy_id = $1 
        AND bc.fiscal_year = $2
        AND bc.is_active = true
      GROUP BY bc.id
      ORDER BY bc.category_type, bc.category_name
    `, [academyId, resolvedYear2]);

    const categories = result.rows.map(row => ({
      ...row,
      spent_amount: parseFloat(row.spent_amount),
      budgeted_amount: parseFloat(row.budgeted_amount),
      remaining_amount: parseFloat(row.budgeted_amount) - parseFloat(row.spent_amount),
      percentage_used: parseFloat(row.budgeted_amount) > 0
        ? ((parseFloat(row.spent_amount) / parseFloat(row.budgeted_amount)) * 100).toFixed(2)
        : 0
    }));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget categories'
    });
  }
};

router.get('/:academyId/budget-categories', handleGetBudgetCategories);

// POST /api/financial-transactions/:academyId/budget-categories - Create budget category
const handleCreateBudgetCategory: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const category: BudgetCategory = { ...req.body, academy_id: academyId }; // Fixed: Use academyId as string UUID

    const result = await query(`
      INSERT INTO budget_categories (
        academy_id, category_name, category_type, budgeted_amount, 
        period_type, fiscal_year, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      category.academy_id,
      category.category_name,
      category.category_type,
      category.budgeted_amount,
      category.period_type || 'monthly',
      category.fiscal_year || new Date().getFullYear(),
      category.is_active !== false
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating budget category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create budget category'
    });
  }
};

router.post('/:academyId/budget-categories', handleCreateBudgetCategory);

// PUT /api/financial-transactions/budget-categories/:id - Update budget category
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
      return res.status(404).json({
        success: false,
        error: 'Budget category not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating budget category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update budget category'
    });
  }
};

router.put('/budget-categories/:id', handleUpdateBudgetCategory);

// DELETE /api/financial-transactions/budget-categories/:id - Delete budget category
const handleDeleteBudgetCategory: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM budget_categories 
      WHERE id = $1
      RETURNING id, category_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Budget category not found'
      });
    }

    res.json({
      success: true,
      message: `Budget category "${result.rows[0].category_name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting budget category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete budget category'
    });
  }
};

router.delete('/budget-categories/:id', handleDeleteBudgetCategory);

export default router;