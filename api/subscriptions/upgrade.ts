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

        // 1. Get current subscription
        const { data: currentSubscription, error: currentSubError } = await supabase
            .from('academy_subscriptions')
            .select('*, subscription_plans(name)')
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE')
            .single();

        // 2. Get new plan details
        // Check for fallback/mock plans first (free, basic, pro, elite)
        let newPlan;
        if (['free', 'basic', 'pro', 'elite'].includes(newPlanId)) {
            const fallbackPlans = [
                { id: 'free', name: 'Free Plan', price: 0 },
                { id: 'basic', name: 'Basic Plan', price: 19.99 },
                { id: 'pro', name: 'Pro Plan', price: 49.99 },
                { id: 'elite', name: 'Elite Plan', price: 99.99 }
            ];
            newPlan = fallbackPlans.find(p => p.id === newPlanId);
        } else {
            // Fetch from DB if not a fallback plan ID
            const { data: dbPlan, error: newPlanError } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('id', newPlanId)
                .eq('is_active', true)
                .single();
            
            if (!newPlanError && dbPlan) {
                newPlan = dbPlan;
            }
        }

        if (!newPlan) {
            throw new Error('Invalid or inactive subscription plan');
        }

        // 3. Deactivate current subscription if exists
        if (currentSubscription) {
            await supabase
                .from('academy_subscriptions')
                .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                .eq('id', currentSubscription.id);
        }

        // 4. Create new subscription
        const newSubscriptionId = uuidv4();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

        // If we are using a fallback plan (e.g. 'free') that doesn't exist in the DB,
        // we can't insert it as a foreign key if the column type is UUID and references subscription_plans.
        // We need to check if the plan exists in DB first.
        // If it's a fallback plan and not in DB, we should try to find a real plan ID or create a placeholder plan.
        
        let dbPlanId = newPlanId;
        
        // If it's a fallback plan, ensure it exists in the DB to satisfy foreign key constraints
        if (['free', 'basic', 'pro', 'elite'].includes(newPlanId)) {
             // Try to find it again just to be sure
             const { data: existingPlan } = await supabase
                .from('subscription_plans')
                .select('id')
                .eq('name', newPlan.name) // Search by name since ID 'free' might not be valid UUID
                .single();
                
             if (existingPlan) {
                 dbPlanId = existingPlan.id;
             } else {
                 // If it doesn't exist, we might need to create it if possible, or fail gracefully.
                 // However, usually 'free' is not a valid UUID.
                 // Let's check if the input 'newPlanId' is a valid UUID.
                 const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                 if (!uuidRegex.test(newPlanId)) {
                     // It's not a UUID (e.g. "free"), so we can't use it if the column is UUID.
                     // We must create a temporary plan in the DB or find one.
                     // For now, let's try to insert the plan into subscription_plans if it doesn't exist
                     // with a new valid UUID.
                     
                     const newDbPlanId = uuidv4();
                     const { error: insertPlanError } = await supabase
                        .from('subscription_plans')
                        .insert({
                            id: newDbPlanId,
                            name: newPlan.name,
                            price: newPlan.price,
                            interval: 'month',
                            description: 'Auto-generated plan',
                            is_active: true
                        });
                        
                     if (!insertPlanError) {
                         dbPlanId = newDbPlanId;
                     } else {
                         // If we can't create it, we are stuck.
                         // But maybe the column allows text? The error says "invalid input syntax for type uuid: "free"".
                         // So it IS a UUID column.
                         console.warn('Could not create plan in DB, using fallback ID which might fail:', newPlanId);
                     }
                 }
             }
        }

        const { data: newSubscription, error: createSubError } = await supabase
            .from('academy_subscriptions')
            .insert({
                id: newSubscriptionId,
                academy_id: academyId,
                plan_id: dbPlanId,
                status: 'ACTIVE',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                auto_renew: true
            })
            .select()
            .single();

        if (createSubError) {
            // If it's a UUID error, it means the DB expects a UUID but we sent "free"
            // This implies the fallback plan ID "free" is not in the DB and the DB enforces UUID foreign key
            // In this case, we can't really create a relationship if the plan doesn't exist in DB
            // BUT, for the sake of this fix, if we are using a fallback plan, we probably shouldn't be inserting into
            // academy_subscriptions with a plan_id that doesn't exist in subscription_plans table if FK exists.
            // However, if we assume the DB is flexible or we are just mocking:
            throw new Error('Failed to create new subscription: ' + createSubError.message);
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
        const isFree = newPlan.price === 0;

        await supabase
            .from('subscription_payments')
            .insert({
                id: paymentId,
                subscription_id: newSubscriptionId,
                amount: newPlan.price,
                currency: 'USD',
                payment_method: isFree ? 'CARD' : (paymentMethod || 'CARD'), // Default to CARD for free plans if null
                payment_reference: isFree ? 'FREE_PLAN' : (paymentReference || null),
                status: isFree || paymentMethod !== 'CASH' ? 'COMPLETED' : 'PENDING',
                notes: isFree ? ('Free plan activation' + (notes ? ': ' + notes : '')) : notes
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
                paymentStatus: isFree || paymentMethod !== 'CASH' ? 'COMPLETED' : 'PENDING'
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
