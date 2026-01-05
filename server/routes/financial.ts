
import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// GET /api/financial/summary
const handleGetSummary: RequestHandler = async (req, res) => {
    try {
        const academyId = req.query.academyId as string;

        // Get completed financial transactions
        const txResult = await query(
            `SELECT amount, transaction_type, transaction_date 
             FROM financial_transactions 
             WHERE academy_id = $1 AND status = 'completed'`,
            [academyId]
        );

        let totalRevenue = 0;
        let totalExpenses = 0;
        const monthlyStats: Record<string, { revenue: number, expenses: number }> = {};

        // Initialize last 6 months
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toLocaleString('default', { month: 'short' });
            monthlyStats[monthKey] = { revenue: 0, expenses: 0 };
        }

        txResult.rows.forEach((tx: any) => {
            const amount = Number(tx.amount) || 0;
            const date = new Date(tx.transaction_date);
            const monthKey = date.toLocaleString('default', { month: 'short' });

            if (tx.transaction_type === 'income') {
                totalRevenue += amount;
                if (monthlyStats[monthKey]) monthlyStats[monthKey].revenue += amount;
            } else if (tx.transaction_type === 'expense') {
                totalExpenses += amount;
                if (monthlyStats[monthKey]) monthlyStats[monthKey].expenses += amount;
            }
        });

        // Get completed transfers
        const transferResult = await query(
            `SELECT transfer_amount, transfer_date, created_at 
             FROM transfers 
             WHERE academy_id = $1 AND status = 'completed'`,
            [academyId]
        );

        transferResult.rows.forEach((t: any) => {
            // Assuming all completed transfers are revenue for now
            const amount = Number(t.transfer_amount) || 0;
            totalRevenue += amount;

            const dateStr = t.transfer_date || t.created_at;
            const date = new Date(dateStr);
            const monthKey = date.toLocaleString('default', { month: 'short' });

            if (monthlyStats[monthKey]) monthlyStats[monthKey].revenue += amount;
        });

        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';
        const monthlyGrowth = 0; 

        // Convert monthlyStats object to array
        const monthlyData = Object.entries(monthlyStats).map(([month, stats]) => ({
            month,
            revenue: stats.revenue,
            expenses: stats.expenses,
            profit: stats.revenue - stats.expenses
        }));

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalExpenses,
                netProfit,
                profitMargin,
                monthlyGrowth,
                monthlyData
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
        const academyId = req.query.academyId as string;
        
        if (!academyId) {
            return res.json({
                success: true,
                data: []
            });
        }

        const result = await query(
            `SELECT * FROM budget_categories 
             WHERE academy_id = $1 AND is_active = true
             ORDER BY category_type, category_name`,
            [academyId]
        );

        res.json({
            success: true,
            data: result.rows
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
router.get('/transactions/:academyId', handleGetTransactions);
router.get('/transactions', handleGetTransactions);
router.get('/categories', handleGetCategories);

export default router;
