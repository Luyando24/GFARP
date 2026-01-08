
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET - List transactions
    if (req.method === 'GET') {
        try {
            const { page = 1, limit = 50, type, category, status, dateFrom, dateTo, search } = req.query;
            let academyId = req.query.academyId as string;

            if (!academyId || academyId === 'undefined' || academyId === 'null') {
                // Try fallback to id param
                const pathId = req.query.id as string;
                if (pathId && pathId !== 'undefined' && pathId !== 'null') {
                    academyId = pathId;
                } else {
                    return res.status(400).json({ success: false, message: 'Academy ID is required' });
                }
            }

            let query = supabase
                .from('financial_transactions')
                .select('*', { count: 'exact' })
                .eq('academy_id', academyId);

            if (type && type !== 'all') query = query.eq('transaction_type', type);
            if (category) query = query.eq('category', category);
            if (status) query = query.eq('status', status);
            if (dateFrom) query = query.gte('transaction_date', dateFrom);
            if (dateTo) query = query.lte('transaction_date', dateTo);
            if (search) {
                query = query.or(`description.ilike.%${search}%,reference_number.ilike.%${search}%`);
            }

            // Pagination
            const pageNum = Number(page);
            const limitNum = Number(limit);
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            query = query.order('transaction_date', { ascending: false }).range(from, to);

            const { data: transactions, count, error } = await query;

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: {
                    transactions,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: count || 0,
                        totalPages: Math.ceil((count || 0) / limitNum),
                        hasNext: (count || 0) > to + 1,
                        hasPrev: pageNum > 1
                    }
                }
            });
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // POST - Create transaction
    if (req.method === 'POST') {
        try {
            const transaction = req.body;
            
            // Populate academy_id from query if missing
            if (!transaction.academy_id && req.query.academyId) {
                transaction.academy_id = req.query.academyId;
            }

            // Basic validation
            if (!transaction.academy_id) {
                return res.status(400).json({ success: false, message: 'Academy ID is required' });
            }
            if (!transaction.amount) {
                return res.status(400).json({ success: false, message: 'Amount is required' });
            }
            if (!transaction.category) {
                return res.status(400).json({ success: false, message: 'Category is required' });
            }

            const { data, error } = await supabase
                .from('financial_transactions')
                .insert(transaction)
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });
        } catch (error: any) {
            console.error('Error creating transaction:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
}
