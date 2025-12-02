
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[VERCEL] Missing Supabase environment variables');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const academyId = req.query.academyId as string;
        
        // Calculate total revenue and expenses from transactions
        let query = supabase
            .from('financial_transactions')
            .select('amount, transaction_type, status, transaction_date');
            
        if (academyId) {
            query = query.eq('academy_id', academyId);
        }
        
        // Only include completed transactions
        query = query.eq('status', 'completed');
        
        const { data: transactions, error } = await query;

        if (error) {
            throw error;
        }

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

        transactions?.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            const date = new Date(tx.transaction_date);
            const monthKey = date.toLocaleString('default', { month: 'short' });

            if (tx.transaction_type === 'income') {
                totalRevenue += amount;
                // Only update monthly stats if the key exists (i.e., within the last 6 months)
                if (monthlyStats[monthKey]) monthlyStats[monthKey].revenue += amount;
            } else if (tx.transaction_type === 'expense') {
                totalExpenses += amount;
                if (monthlyStats[monthKey]) monthlyStats[monthKey].expenses += amount;
            }
        });

        // Also include transfer revenue
        // Only fetch completed transfers
        let transferQuery = supabase
            .from('transfers')
            .select('transfer_amount, status, transfer_type, transfer_date, created_at')
            .eq('status', 'completed');
            
        if (academyId) {
            transferQuery = transferQuery.eq('academy_id', academyId);
        }
        
        const { data: transfers, error: transferError } = await transferQuery;
        
        if (!transferError && transfers) {
            transfers.forEach(t => {
                const amount = Number(t.transfer_amount) || 0;
                // Use transfer_date or created_at
                const dateStr = t.transfer_date || t.created_at;
                const date = new Date(dateStr);
                const monthKey = date.toLocaleString('default', { month: 'short' });

                // Assuming transfers are revenue
                totalRevenue += amount;
                if (monthlyStats[monthKey]) monthlyStats[monthKey].revenue += amount;
            });
        }

        const netProfit = totalRevenue - totalExpenses;
        // Fix profit margin calculation: avoid division by zero
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';
        const monthlyGrowth = 0; // Placeholder for now 

        // Convert monthlyStats object to array
        const monthlyData = Object.entries(monthlyStats).map(([month, stats]) => ({
            month,
            revenue: stats.revenue,
            expenses: stats.expenses,
            profit: stats.revenue - stats.expenses
        }));

        return res.status(200).json({
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
    } catch (error: any) {
        console.error('Error fetching financial summary:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}
