
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
            .select('amount, transaction_type, status');
            
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

        transactions?.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            if (tx.transaction_type === 'income') {
                totalRevenue += amount;
            } else if (tx.transaction_type === 'expense') {
                totalExpenses += amount;
            }
        });

        // Also include transfer revenue
        let transferQuery = supabase
            .from('transfers')
            .select('transfer_amount, status, transfer_type');
            
        if (academyId) {
            transferQuery = transferQuery.eq('academy_id', academyId);
        }
        
        // Only include completed transfers (both income and expense)
        // Assuming transfers OUT are income (selling player) and transfers IN are expense (buying player)
        // But transfer_type in DB is 'permanent', 'loan', etc.
        // We need to infer direction. For now, let's assume 'completed' transfers with amount > 0 are revenue
        // In a real app, we'd check if from_club or to_club matches the academy
        
        const { data: transfers, error: transferError } = await transferQuery;
        
        if (!transferError && transfers) {
            transfers.forEach(t => {
                if (t.status === 'completed') {
                    // Simplified logic: Assuming all recorded transfers are revenue for now
                    // You might want to refine this based on 'from_club' vs 'to_club'
                    totalRevenue += Number(t.transfer_amount) || 0;
                }
            });
        }

        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

        // Calculate monthly growth (mock calculation for now, or compare with last month)
        const monthlyGrowth = 0; 

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalExpenses,
                netProfit,
                profitMargin,
                monthlyGrowth
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
