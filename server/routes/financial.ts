
import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// GET /api/financial/summary
const handleGetSummary: RequestHandler = async (req, res) => {
    try {
        const academyId = req.query.academyId as string;

        // Get completed financial transactions
        const txResult = await query(
            `SELECT amount, transaction_type 
             FROM financial_transactions 
             WHERE academy_id = $1 AND status = 'completed'`,
            [academyId]
        );

        let totalRevenue = 0;
        let totalExpenses = 0;

        txResult.rows.forEach((tx: any) => {
            const amount = Number(tx.amount) || 0;
            if (tx.transaction_type === 'income') {
                totalRevenue += amount;
            } else if (tx.transaction_type === 'expense') {
                totalExpenses += amount;
            }
        });

        // Get completed transfers
        const transferResult = await query(
            `SELECT transfer_amount 
             FROM transfers 
             WHERE academy_id = $1 AND status = 'completed'`,
            [academyId]
        );

        transferResult.rows.forEach((t: any) => {
            // Assuming all completed transfers are revenue for now
            totalRevenue += Number(t.transfer_amount) || 0;
        });

        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';
        const monthlyGrowth = 0; // Placeholder

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalExpenses,
                netProfit,
                profitMargin,
                monthlyGrowth
            }
        });
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// GET /api/financial/transactions
const handleGetTransactions: RequestHandler = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const academyId = req.params.academyId || req.query.academyId;
        
        if (!academyId) {
            return res.status(400).json({ success: false, message: 'Academy ID is required' });
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const offset = (pageNum - 1) * limitNum;
        
        const result = await query(
            `SELECT * FROM financial_transactions 
             WHERE academy_id = $1 
             ORDER BY transaction_date DESC 
             LIMIT $2 OFFSET $3`,
            [academyId, limitNum, offset]
        );
        
        const countResult = await query(
            `SELECT COUNT(*) as total FROM financial_transactions WHERE academy_id = $1`,
            [academyId]
        );
        
        const total = Number(countResult.rows[0].total);
        
        res.json({
            success: true,
            data: {
                transactions: result.rows,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    totalPages: Math.ceil(total / limitNum),
                    hasNext: offset + limitNum < total,
                    hasPrev: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// GET /api/financial/categories
const handleGetCategories: RequestHandler = async (req, res) => {
    try {
        // Mock for now as we don't have budget_categories table in the initial context
        const mockCategories = [
            { id: 1, category_name: 'Academy Fees', category_type: 'revenue', budgeted_amount: 300000, is_active: true },
            { id: 2, category_name: 'Sponsorship', category_type: 'revenue', budgeted_amount: 500000, is_active: true },
            { id: 4, category_name: 'Staff Salaries', category_type: 'expense', budgeted_amount: 200000, is_active: true },
            { id: 5, category_name: 'Facilities', category_type: 'expense', budgeted_amount: 100000, is_active: true },
            { id: 6, category_name: 'Equipment', category_type: 'expense', budgeted_amount: 80000, is_active: true },
            { id: 7, category_name: 'Travel', category_type: 'expense', budgeted_amount: 50000, is_active: true }
        ];

        res.json({
            success: true,
            data: mockCategories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

router.get('/summary', handleGetSummary);
router.get('/transactions/:academyId', handleGetTransactions); // Support param based
router.get('/transactions', handleGetTransactions); // Support query based
router.get('/categories', handleGetCategories);

export default router;
