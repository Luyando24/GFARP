import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Subscription upgrade request received');

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
        const { academyId, newPlanId, paymentMethod, paymentReference, notes } = req.body;

        if (!academyId || !newPlanId) {
            return res.status(400).json({
                success: false,
                message: 'Academy ID and new plan ID are required'
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

        // 1. Get new plan details first to determine the target table
        let newPlan;
        const { data: dbPlan, error: newPlanError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', newPlanId)
            .eq('is_active', true)
            .single();
        
        if (newPlanError || !dbPlan) {
            // Check fallback
            if (newPlanId === 'pro') {
                newPlan = { id: 'pro', name: 'Pro Plan', price: 49.99, target_type: 'ACADEMY' };
            } else {
                throw new Error('Invalid or inactive subscription plan');
            }
        } else {
            newPlan = dbPlan;
        }

        const isAgencyPlan = newPlan.target_type === 'AGENCY';
        const isIndividualPlan = newPlan.target_type === 'INDIVIDUAL';
        
        const subTable = isAgencyPlan ? 'agency_subscriptions' : 'academy_subscriptions';
        const idColumn = isAgencyPlan ? 'agency_id' : 'academy_id';

        // 2. Get current subscription from the appropriate table
        const { data: currentSubscription } = await supabase
            .from(subTable)
            .select('*, subscription_plans(name)')
            .eq(idColumn, academyId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        // 3. Deactivate current subscription if exists
        if (currentSubscription) {
            await supabase
                .from(subTable)
                .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                .eq('id', currentSubscription.id);
        }

        // 4. Create new subscription
        const newSubscriptionId = uuidv4();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

        const { data: newSubscription, error: createSubError } = await supabase
            .from(subTable)
            .insert({
                id: newSubscriptionId,
                [idColumn]: academyId,
                plan_id: newPlan.id,
                status: 'ACTIVE',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                auto_renew: true
            })
            .select()
            .single();

        if (createSubError) {
            throw new Error(`Failed to create new subscription in ${subTable}: ${createSubError.message}`);
        }

        // 5. Log history
        const action = currentSubscription ? 'UPGRADED' : 'CREATED';
        const historyNotes = currentSubscription
            ? `Plan upgraded from ${currentSubscription.subscription_plans?.name || 'Unknown'} to ${newPlan.name}`
            : `Initial subscription created with ${newPlan.name} plan`;

        await supabase
            .from('subscription_history')
            .insert({
                subscription_id: newSubscriptionId,
                action: action,
                old_plan_id: currentSubscription?.plan_id || null,
                new_plan_id: newPlanId,
                notes: historyNotes
            });

        // 6. Create payment record
        const paymentId = uuidv4();

        await supabase
            .from('subscription_payments')
            .insert({
                id: paymentId,
                subscription_id: newSubscriptionId,
                amount: newPlan.price,
                currency: 'USD',
                payment_method: (paymentMethod || 'CARD'), // Default to CARD if null
                payment_reference: (paymentReference || null),
                status: paymentMethod !== 'CASH' ? 'COMPLETED' : 'PENDING',
                notes: notes
            });

        return res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: {
                subscription: {
                    id: newSubscription.id,
                    planName: newPlan.name,
                    status: newSubscription.status,
                    startDate: newSubscription.start_date,
                    endDate: newSubscription.end_date
                },
                paymentId: paymentId,
                paymentStatus: paymentMethod !== 'CASH' ? 'COMPLETED' : 'PENDING'
            }
        });

    } catch (error: any) {
        console.error('[VERCEL] Upgrade error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update subscription plan',
            error: error.message
        });
    }
}
