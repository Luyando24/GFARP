
import { Router, RequestHandler } from 'express';
import { query } from '../lib/db.js';

const router = Router();

// Mock data to match Vercel functions when DB is not set up or empty
const mockSummary = {
    totalRevenue: 850000,
    totalExpenses: 550000,
    netProfit: 300000,
    profitMargin: 35.3,
    monthlyGrowth: 12.5
};

const mockTransactions = [
    {
        id: 1,
        type: 'income',
        category: 'Sponsorship',
        amount: 50000,
        date: '2024-03-15',
        description: 'Annual sponsorship payment - Nike',
        status: 'completed'
    },
    {
        id: 2,
        type: 'expense',
        category: 'Equipment',
        amount: 12500,
        date: '2024-03-14',
        description: 'Training kits and balls',
        status: 'completed'
    },
    {
        id: 3,
        type: 'income',
        category: 'Academy Fees',
        amount: 25000,
        date: '2024-03-12',
        description: 'March tuition fees batch 1',
        status: 'completed'
    },
    {
        id: 4,
        type: 'expense',
        category: 'Facilities',
        amount: 8000,
        date: '2024-03-10',
        description: 'Field maintenance',
        status: 'pending'
    },
    {
        id: 5,
        type: 'expense',
        category: 'Travel',
        amount: 3500,
        date: '2024-03-08',
        description: 'Bus rental for away game',
        status: 'completed'
    }
];

const mockCategories = [
    { id: 1, name: 'Academy Fees', type: 'income', budget: 300000, actual: 250000, variance: -50000 },
    { id: 2, name: 'Sponsorship', type: 'income', budget: 500000, actual: 550000, variance: 50000 },
    { id: 3, name: 'Merchandise', type: 'income', budget: 50000, actual: 45000, variance: -5000 },
    { id: 4, name: 'Staff Salaries', type: 'expense', budget: 200000, actual: 195000, variance: 5000 },
    { id: 5, name: 'Facilities', type: 'expense', budget: 100000, actual: 110000, variance: -10000 },
    { id: 6, name: 'Equipment', type: 'expense', budget: 80000, actual: 75000, variance: 5000 },
    { id: 7, name: 'Travel', type: 'expense', budget: 50000, actual: 45000, variance: 5000 }
];

// GET /api/financial/summary
const handleGetSummary: RequestHandler = async (req, res) => {
    try {
        // Try to fetch real data if available, otherwise use mock
        // For now, we'll return the mock data to match the Vercel function behavior
        // which was set up to return mock data initially
        res.json({
            success: true,
            data: mockSummary
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
        const pageNum = Number(page);
        const limitNum = Number(limit);
        
        // Return mock transactions
        res.json({
            success: true,
            data: {
                transactions: mockTransactions,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: mockTransactions.length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
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
router.get('/transactions', handleGetTransactions);
router.get('/categories', handleGetCategories);

export default router;
