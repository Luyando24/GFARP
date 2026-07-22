
import { Router, RequestHandler } from 'express';
import { query, transaction as dbTransaction } from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { processPlayerFeeRenewalReminders } from '../lib/player-fee-reminders.js';

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
  currency?: string;
  player_id?: string;
  player_source?: 'academy' | 'individual';
  player_name?: string;
  player_email?: string;
  payment_type?: 'monthly' | 'yearly' | 'custom';
  custom_payment_type?: string;
  is_external_payment?: boolean;
  fee_subscription_id?: string;
  is_recurring?: boolean;
  next_renewal_date?: string;
  reminder_days_before?: number;
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

const normalizeCurrency = (value: unknown) => String(value || 'USD').trim().toUpperCase();
const decryptPlayerValue = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('\\x')) {
    return Buffer.from(value.slice(2), 'hex').toString('utf8');
  }
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return Buffer.from(value as ArrayBuffer).toString('utf8');
  }
  return String(value);
};

function canAccessAcademy(req: any, academyId: string) {
  const user = req.user || {};
  if (['admin', 'superadmin', 'ADMIN', 'SUPERADMIN'].includes(user.role)) return true;
  const authenticatedAcademyId = user.academyId || user.schoolId || user.id;
  return Boolean(authenticatedAcademyId && String(authenticatedAcademyId) === String(academyId));
}

function requireAcademyAccess(req: any, res: any, academyId: string) {
  if (canAccessAcademy(req, academyId)) return true;
  res.status(403).json({ success: false, error: 'You do not have access to this academy financial data' });
  return false;
}

async function resolveAcademyPlayer(client: any, academyId: string, playerId: string) {
  const result = await client.query(`
    SELECT * FROM (
      SELECT id, 'academy'::text AS player_source,
             first_name_cipher, last_name_cipher, email_cipher
      FROM players WHERE academy_id = $1 AND id = $2
      UNION ALL
      SELECT id, 'individual'::text AS player_source,
             first_name::bytea AS first_name_cipher,
             last_name::bytea AS last_name_cipher,
             email::bytea AS email_cipher
      FROM individual_players WHERE academy_id = $1 AND id = $2
    ) academy_players
    LIMIT 1
  `, [academyId, playerId]);

  if (!result.rows.length) return null;
  const player = result.rows[0];
  return {
    id: player.id,
    source: player.player_source as 'academy' | 'individual',
    name: `${decryptPlayerValue(player.first_name_cipher)} ${decryptPlayerValue(player.last_name_cipher)}`.trim(),
    email: decryptPlayerValue(player.email_cipher),
  };
}

// --- Handlers ---

// GET /api/financial-transactions/:academyId/summary
const handleGetSummary: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const currency = req.query.currency ? normalizeCurrency(req.query.currency) : null;
    if (!requireAcademyAccess(req, res, academyId)) return;
    
    // 1. Get total revenue and expenses from Financial Transactions
    const summaryResult = await query(`
      SELECT 
        transaction_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE academy_id = $1 AND status = 'completed'
        AND ($2::text IS NULL OR currency = $2)
      GROUP BY transaction_type
    `, [academyId, currency]);

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
        AND ($2::text IS NULL OR COALESCE(NULLIF(t.currency, ''), 'USD') = $2)
        AND NOT EXISTS (
          SELECT 1 FROM financial_transactions ft 
          WHERE ft.reference_number = 'TRF-' || t.id::text
        )
    `, [academyId, currency]);

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
          AND ($2::text IS NULL OR currency = $2)
        
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
          AND ($2::text IS NULL OR COALESCE(NULLIF(t.currency, ''), 'USD') = $2)
          AND NOT EXISTS (
            SELECT 1 FROM financial_transactions ft 
            WHERE ft.reference_number = 'TRF-' || t.id::text
          )
      ) as combined
      GROUP BY transaction_type, category
      ORDER BY total_amount DESC
    `, [academyId, currency]);

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
          AND ($2::text IS NULL OR currency = $2)
          AND EXTRACT(YEAR FROM transaction_date) = $3
          
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
          AND ($2::text IS NULL OR COALESCE(NULLIF(t.currency, ''), 'USD') = $2)
          AND EXTRACT(YEAR FROM t.transfer_date) = $3
          AND NOT EXISTS (
            SELECT 1 FROM financial_transactions ft 
            WHERE ft.reference_number = 'TRF-' || t.id::text
          )
      ) as combined
      GROUP BY month, transaction_type
      ORDER BY month
    `, [academyId, currency, year as any]);

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
        currency: currency || 'MIXED',
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
    if (!requireAcademyAccess(req, res, academyId)) return;
    const { year = new Date().getFullYear() } = req.query;

    const result = await query(`
      SELECT * FROM budget_categories 
      WHERE academy_id = $1 AND fiscal_year = $2 AND is_active = true
      ORDER BY category_type, category_name
    `, [academyId, year as any]);

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

    console.log(`[CreateBudget] Academy: ${academyId}, Body:`, JSON.stringify(category));

    if (!academyId || academyId === 'undefined' || academyId === 'null') {
         return res.status(400).json({ success: false, error: 'Invalid Academy ID provided in URL' });
    }
    if (!requireAcademyAccess(req, res, academyId)) return;

    // Basic validation
    if (!category) {
        return res.status(400).json({ success: false, error: 'Request body is empty' });
    }
    if (!category.category_name) {
        return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    if (category.budgeted_amount === undefined || category.budgeted_amount === null) {
        return res.status(400).json({ success: false, error: 'Budgeted amount is required' });
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
    const owner = await query('SELECT academy_id FROM budget_categories WHERE id = $1', [id]);
    if (!owner.rows.length) return res.status(404).json({ success: false, error: 'Budget category not found' });
    if (!requireAcademyAccess(req, res, owner.rows[0].academy_id)) return;

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
    const owner = await query('SELECT academy_id FROM budget_categories WHERE id = $1', [id]);
    if (!owner.rows.length) return res.status(404).json({ success: false, error: 'Budget category not found' });
    if (!requireAcademyAccess(req, res, owner.rows[0].academy_id)) return;
    
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
    if (!requireAcademyAccess(req, res, academyId)) return;
    const {
      page = 1,
      limit = 50,
      type,
      category,
      status,
      dateFrom,
      dateTo,
      search,
      currency,
      playerFeesOnly,
    } = req.query;

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(200, Math.max(1, Number(limit) || 50));

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
      whereConditions.push(`(description ILIKE $${paramIndex} OR reference_number ILIKE $${paramIndex} OR player_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (currency) {
      whereConditions.push(`currency = $${paramIndex}`);
      queryParams.push(normalizeCurrency(currency));
      paramIndex++;
    }

    if (playerFeesOnly === 'true') {
      whereConditions.push('(player_id IS NOT NULL OR category = \'Academy Fees\')');
    }

    const offset = (parsedPage - 1) * parsedLimit;

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

    queryParams.push(parsedLimit, offset);

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, queryParams.slice(0, -2)),
      query(dataQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      data: {
        transactions: dataResult.rows,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages,
          hasNext: parsedPage < totalPages,
          hasPrev: parsedPage > 1
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
    const financialEntry: FinancialTransaction = req.body;
    if (!financialEntry.academy_id || !requireAcademyAccess(req, res, financialEntry.academy_id)) return;
    const actorId = (req as any).user?.id || null;
    if (!financialEntry.category || !financialEntry.description || Number(financialEntry.amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Category, description, and a positive amount are required' });
    }

    const currency = normalizeCurrency(financialEntry.currency);
    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ success: false, error: 'Currency must be a three-letter ISO code' });
    }
    if (financialEntry.is_recurring && (!financialEntry.player_id || !financialEntry.next_renewal_date)) {
      return res.status(400).json({ success: false, error: 'A player and next renewal date are required for recurring fees' });
    }
    if (financialEntry.payment_type === 'custom' && !financialEntry.custom_payment_type?.trim()) {
      return res.status(400).json({ success: false, error: 'Enter a custom payment type' });
    }

    const result = await dbTransaction(async (client) => {
      let player: Awaited<ReturnType<typeof resolveAcademyPlayer>> = null;
      if (financialEntry.player_id) {
        player = await resolveAcademyPlayer(client, financialEntry.academy_id, financialEntry.player_id);
        if (!player) throw new Error('Selected player does not belong to this academy');
        if (financialEntry.is_recurring && !player.email) {
          throw new Error('The selected player needs an email address before renewal reminders can be enabled');
        }
      }

      let feeSubscriptionId = financialEntry.fee_subscription_id || null;
      if (feeSubscriptionId) {
        const existing = await client.query(
          'SELECT id FROM player_fee_subscriptions WHERE id = $1 AND academy_id = $2',
          [feeSubscriptionId, financialEntry.academy_id],
        );
        if (!existing.rows.length) throw new Error('Player fee subscription not found');
      } else if (financialEntry.is_recurring && player) {
        const subscriptionResult = await client.query(`
          INSERT INTO player_fee_subscriptions (
            academy_id, player_id, player_source, player_name, player_email,
            fee_name, amount, currency, billing_cycle, custom_billing_label,
            next_renewal_date, reminder_days_before, notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id
        `, [
          financialEntry.academy_id,
          player.id,
          player.source,
          player.name,
          player.email,
          financialEntry.description,
          Number(financialEntry.amount),
          currency,
          financialEntry.payment_type || 'monthly',
          financialEntry.custom_payment_type || null,
          financialEntry.next_renewal_date,
          Math.min(90, Math.max(0, Number(financialEntry.reminder_days_before ?? 7))),
          financialEntry.notes || null,
          actorId,
        ]);
        feeSubscriptionId = subscriptionResult.rows[0].id;
      }

      const insertResult = await client.query(`
        INSERT INTO financial_transactions (
          academy_id, transaction_type, category, subcategory, amount,
          description, transaction_date, payment_method, reference_number,
          status, notes, created_by, currency, player_id, player_source,
          player_name, player_email, payment_type, custom_payment_type,
          is_external_payment, fee_subscription_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `, [
        financialEntry.academy_id,
        financialEntry.transaction_type || 'income',
        financialEntry.category,
        financialEntry.subcategory || null,
        Number(financialEntry.amount),
        financialEntry.description,
        financialEntry.transaction_date || new Date().toISOString().split('T')[0],
        financialEntry.payment_method || null,
        financialEntry.reference_number || null,
        financialEntry.status || 'completed',
        financialEntry.notes || null,
        actorId,
        currency,
        player?.id || null,
        player?.source || null,
        player?.name || null,
        player?.email || null,
        financialEntry.payment_type || null,
        financialEntry.custom_payment_type || null,
        financialEntry.player_id ? true : Boolean(financialEntry.is_external_payment),
        feeSubscriptionId,
      ]);

      if (financialEntry.fee_subscription_id && financialEntry.status !== 'pending') {
        await client.query(`
          UPDATE player_fee_subscriptions
          SET next_renewal_date = CASE
                WHEN billing_cycle = 'monthly' THEN next_renewal_date + INTERVAL '1 month'
                WHEN billing_cycle = 'yearly' THEN next_renewal_date + INTERVAL '1 year'
                ELSE COALESCE($2::date, next_renewal_date)
              END,
              last_reminder_sent_for = NULL,
              last_reminder_sent_at = NULL
          WHERE id = $1
        `, [financialEntry.fee_subscription_id, financialEntry.next_renewal_date || null]);
      }
      return insertResult;
    });

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating financial transaction:', error);
    const clientError = /required|currency|player|subscription|custom payment/i.test(error.message || '');
    res.status(clientError ? 400 : 500).json({ success: false, error: error.message || 'Failed to create financial transaction' });
  }
};

// PUT /api/financial-transactions/:id
const handleUpdateTransaction: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Update Transaction Request:', { id, body: req.body });
    const transaction: Partial<FinancialTransaction> = req.body;
    const owner = await query('SELECT academy_id FROM financial_transactions WHERE id = $1', [id]);
    if (!owner.rows.length) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (!requireAcademyAccess(req, res, owner.rows[0].academy_id)) return;

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
        currency = COALESCE($11, currency),
        payment_type = COALESCE($12, payment_type),
        custom_payment_type = COALESCE($13, custom_payment_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
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
      transaction.currency ? normalizeCurrency(transaction.currency) : null,
      transaction.payment_type,
      transaction.custom_payment_type,
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
    const owner = await query('SELECT academy_id FROM financial_transactions WHERE id = $1', [id]);
    if (!owner.rows.length) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (!requireAcademyAccess(req, res, owner.rows[0].academy_id)) return;

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

const handleGetFinancialSettings: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!requireAcademyAccess(req, res, academyId)) return;
    await query(`
      INSERT INTO academy_financial_settings (academy_id)
      VALUES ($1) ON CONFLICT (academy_id) DO NOTHING
    `, [academyId]);
    const result = await query(
      'SELECT * FROM academy_financial_settings WHERE academy_id = $1',
      [academyId],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching academy financial settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch financial settings' });
  }
};

const handleUpdateFinancialSettings: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!requireAcademyAccess(req, res, academyId)) return;
    const currency = normalizeCurrency(req.body.default_currency);
    const reminderDays = Math.min(90, Math.max(0, Number(req.body.default_reminder_days ?? 7)));
    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ success: false, error: 'Currency must be a three-letter ISO code' });
    }
    const result = await query(`
      INSERT INTO academy_financial_settings (
        academy_id, default_currency, renewal_reminders_enabled, default_reminder_days
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (academy_id) DO UPDATE SET
        default_currency = EXCLUDED.default_currency,
        renewal_reminders_enabled = EXCLUDED.renewal_reminders_enabled,
        default_reminder_days = EXCLUDED.default_reminder_days,
        updated_at = NOW()
      RETURNING *
    `, [academyId, currency, req.body.renewal_reminders_enabled !== false, reminderDays]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating academy financial settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update financial settings' });
  }
};

const handleGetPlayerFeeSubscriptions: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!requireAcademyAccess(req, res, academyId)) return;
    const result = await query(`
      SELECT pfs.*,
        COALESCE((
          SELECT jsonb_object_agg(d.recipient_type, jsonb_build_object(
            'status', d.status,
            'sentAt', d.sent_at,
            'error', d.error_message
          ))
          FROM player_fee_reminder_deliveries d
          WHERE d.subscription_id = pfs.id
            AND d.renewal_date = pfs.next_renewal_date
        ), '{}'::jsonb) AS reminder_delivery
      FROM player_fee_subscriptions pfs
      WHERE pfs.academy_id = $1
      ORDER BY
        CASE WHEN pfs.status = 'active' THEN 0 ELSE 1 END,
        pfs.next_renewal_date ASC,
        pfs.created_at DESC
    `, [academyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching player fee subscriptions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch player fee subscriptions' });
  }
};

const handleUpdatePlayerFeeSubscription: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = await query('SELECT academy_id FROM player_fee_subscriptions WHERE id = $1', [id]);
    if (!owner.rows.length) return res.status(404).json({ success: false, error: 'Player fee subscription not found' });
    if (!requireAcademyAccess(req, res, owner.rows[0].academy_id)) return;

    const allowedStatuses = ['active', 'paused', 'cancelled', 'completed'];
    if (req.body.status && !allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription status' });
    }
    const result = await query(`
      UPDATE player_fee_subscriptions SET
        amount = COALESCE($1, amount),
        currency = COALESCE($2, currency),
        billing_cycle = COALESCE($3, billing_cycle),
        custom_billing_label = COALESCE($4, custom_billing_label),
        next_renewal_date = COALESCE($5, next_renewal_date),
        reminder_days_before = COALESCE($6, reminder_days_before),
        status = COALESCE($7, status),
        notes = COALESCE($8, notes),
        last_reminder_sent_for = CASE
          WHEN $5::date IS NOT NULL AND $5::date IS DISTINCT FROM next_renewal_date THEN NULL
          ELSE last_reminder_sent_for
        END,
        last_reminder_sent_at = CASE
          WHEN $5::date IS NOT NULL AND $5::date IS DISTINCT FROM next_renewal_date THEN NULL
          ELSE last_reminder_sent_at
        END,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      req.body.amount == null ? null : Number(req.body.amount),
      req.body.currency ? normalizeCurrency(req.body.currency) : null,
      req.body.billing_cycle || null,
      req.body.custom_billing_label || null,
      req.body.next_renewal_date || null,
      req.body.reminder_days_before == null
        ? null
        : Math.min(90, Math.max(0, Number(req.body.reminder_days_before))),
      req.body.status || null,
      req.body.notes ?? null,
      id,
    ]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating player fee subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to update player fee subscription' });
  }
};

const handleProcessAcademyReminders: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.params;
    if (!requireAcademyAccess(req, res, academyId)) return;
    const result = await processPlayerFeeRenewalReminders(academyId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing academy player fee reminders:', error);
    res.status(500).json({ success: false, error: 'Failed to process renewal reminders' });
  }
};

const handleCronReminders: RequestHandler = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET;
  const authorization = req.header('authorization');
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: 'Invalid reminder scheduler credentials' });
  }
  try {
    const result = await processPlayerFeeRenewalReminders();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing scheduled player fee reminders:', error);
    res.status(500).json({ success: false, error: 'Failed to process renewal reminders' });
  }
};

// --- Route Definitions ---

// The scheduler endpoint uses a separate secret because it is called without a user session.
router.post('/reminders/process', handleCronReminders);
router.use(authenticateToken);

// Academy player-fee settings and recurring fee schedules
router.get('/:academyId/settings', handleGetFinancialSettings);
router.put('/:academyId/settings', handleUpdateFinancialSettings);
router.get('/:academyId/player-fee-subscriptions', handleGetPlayerFeeSubscriptions);
router.post('/:academyId/player-fee-reminders/process', handleProcessAcademyReminders);
router.put('/player-fee-subscriptions/:id', handleUpdatePlayerFeeSubscription);

// Budget Categories
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
