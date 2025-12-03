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

        // Fetch active subscription
        const { data: subscription, error } = await supabase
            .from('academy_subscriptions')
            .select(`
                *,
                subscription_plans (
                    name,
                    price,
                    billing_cycle,
                    player_limit,
                    features
                )
            `)
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw error;
        }

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No active subscription found'
            });
        }

        // Calculate days remaining
        const endDate = new Date(subscription.end_date);
        const now = new Date();
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Get usage stats (player count)
        const { count: playerCount, error: countError } = await supabase
            .from('players') // Correct table name
            .select('*', { count: 'exact', head: true })
            .eq('academy_id', academyId);

        if (countError) {
            console.warn('Error fetching player count:', countError);
        }

        const playerLimit = subscription.subscription_plans?.player_limit || 0;
        const usagePercentage = playerLimit > 0 ? Math.round(((playerCount || 0) / playerLimit) * 100) : 0;

        // Format response
        const formattedSubscription = {
            id: subscription.id,
            planName: subscription.subscription_plans?.name || 'Unknown Plan',
            status: subscription.status,
            price: subscription.subscription_plans?.price || 0,
            billingCycle: subscription.subscription_plans?.billing_cycle || 'MONTHLY',
            startDate: subscription.start_date,
            endDate: subscription.end_date,
            autoRenew: subscription.auto_renew,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            playerLimit: playerLimit,
            playerCount: playerCount || 0,
            playerUsagePercentage: usagePercentage,
            features: subscription.subscription_plans?.features || []
        };

        return res.status(200).json({
            success: true,
            data: {
                subscription: formattedSubscription,
                limits: {
                    playerLimit: playerLimit
                },
                usage: {
                    playerCount: playerCount || 0,
                    playerUsagePercentage: usagePercentage
                }
            }
        });

    } catch (error: any) {
        console.error('Error fetching current subscription:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription details',
            error: error.message
        });
    }
}
