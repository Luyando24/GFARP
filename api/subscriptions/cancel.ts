import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Subscription cancellation request received');

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { academyId } = req.body;

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
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Get current active subscription
        const { data: currentSubscription, error: currentSubError } = await supabase
            .from('academy_subscriptions')
            .select('*')
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE')
            .single();

        if (currentSubError || !currentSubscription) {
            return res.status(404).json({
                success: false,
                message: 'No active subscription found'
            });
        }

        // 2. Cancel subscription
        const { error: updateError } = await supabase
            .from('academy_subscriptions')
            .update({ 
                status: 'CANCELLED',
                auto_renew: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentSubscription.id);

        if (updateError) {
            throw new Error('Failed to update subscription status: ' + updateError.message);
        }

        // 3. Log history
        await supabase
            .from('subscription_history')
            .insert({
                subscription_id: currentSubscription.id,
                action: 'CANCELLED',
                old_plan_id: currentSubscription.plan_id,
                new_plan_id: null,
                notes: 'Subscription cancelled by user'
            });

        return res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully'
        });

    } catch (error: any) {
        console.error('[VERCEL] Cancellation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: error.message
        });
    }
}