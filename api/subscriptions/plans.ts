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
        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error: Missing Supabase credentials');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: plans, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (error) {
            throw error;
        }

        // If no plans found in DB, return default plans
        if (!plans || plans.length === 0) {
            const defaultPlans = [
                {
                    id: 'pro',
                    name: 'Pro Plan',
                    price: 49.99,
                    currency: 'USD',
                    billingCycle: 'MONTHLY',
                    playerLimit: 200,
                    features: ['Advanced analytics', 'Video analysis', 'Priority support'],
                    isActive: true,
                    isFree: false,
                    sortOrder: 1
                }
            ];

            return res.status(200).json({
                success: true,
                data: defaultPlans
            });
        }

        return res.status(200).json({
            success: true,
            data: plans
        });

    } catch (error: any) {
        console.error('Error fetching plans:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription plans',
            error: error.message
        });
    }
}
