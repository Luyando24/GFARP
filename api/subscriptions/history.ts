import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { academyId } = req.query;

        if (!academyId) {
            return res.status(400).json({
                success: false,
                message: 'Academy ID is required'
            });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error: Missing Supabase credentials');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch subscription history
        // We need to join with subscription_plans to get plan names
        // Since Supabase join syntax can be tricky with multiple joins, we might need to fetch history first
        // and then fetch plan details if not easily joinable, but let's try standard join.

        // Assuming subscription_history has: id, subscription_id, action, old_plan_id, new_plan_id, notes, created_at
        // And we want to show plan names.

        const { data: history, error } = await supabase
            .from('subscription_history')
            .select(`
                id,
                action,
                notes,
                created_at,
                old_plan:old_plan_id(name),
                new_plan:new_plan_id(name)
            `)
            // We need to filter by academy. But history is linked to subscription_id.
            // We need to find subscriptions for this academy first, or if history has academy_id (unlikely).
            // Let's check if we can filter by subscription's academy_id via join.
            // .eq('subscription.academy_id', academyId) // This might not work directly if not set up in Supabase

            // Alternative: Fetch all subscriptions for this academy, then fetch history for those subscriptions.
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // To filter by academy, we first need the list of subscription IDs for this academy
        const { data: subscriptions, error: subError } = await supabase
            .from('academy_subscriptions')
            .select('id')
            .eq('academy_id', academyId);

        if (subError) throw subError;

        const subscriptionIds = subscriptions.map(s => s.id);

        // Now filter history in memory (or we could have used .in('subscription_id', subscriptionIds) in the query)
        // Let's re-query with the filter to be efficient

        const { data: filteredHistory, error: historyError } = await supabase
            .from('subscription_history')
            .select(`
                id,
                action,
                notes,
                created_at,
                old_plan:old_plan_id(name),
                new_plan:new_plan_id(name)
            `)
            .in('subscription_id', subscriptionIds)
            .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        const formattedHistory = filteredHistory.map((item: any) => ({
            id: item.id,
            action: item.action,
            reason: item.notes,
            previousPlan: item.old_plan?.name,
            newPlan: item.new_plan?.name,
            createdAt: item.created_at
        }));

        return res.status(200).json({
            success: true,
            data: {
                history: formattedHistory
            }
        });

    } catch (error: any) {
        console.error('Error fetching subscription history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription history',
            error: error.message
        });
    }
}
