import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

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

        // 1. Get new plan details first
        let newPlan;
        const { data: dbPlan, error: newPlanError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', newPlanId)
            .eq('is_active', true)
            .single();
        
        if (newPlanError || !dbPlan) {
            if (newPlanId === 'pro') {
                newPlan = { id: 'pro', name: 'Pro Plan', price: 49.99, target_type: 'ACADEMY', currency: 'USD' };
            } else {
                throw new Error('Invalid or inactive subscription plan');
            }
        } else {
            newPlan = dbPlan;
        }

        const isAgencyPlan = newPlan.target_type === 'AGENCY';
        const isIndividualPlan = newPlan.target_type === 'INDIVIDUAL';
        
        // 2. Handle Stripe Checkout if method is CARD
        if (paymentMethod === 'CARD' && newPlan.price > 0) {
            const stripeSecret = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecret) throw new Error('Stripe is not configured on the server');

            const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' as any });

            // Get organization details for customer
            const orgTable = isAgencyPlan ? 'agencies' : 'academies';
            const { data: org } = await supabase.from(orgTable).select('*').eq('id', academyId).single();
            
            if (!org) throw new Error('Organization not found');

            // Ensure Stripe customer exists
            let customerId = org.stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: org.email,
                    name: org.name,
                    metadata: { orgId: academyId, type: newPlan.target_type }
                });
                customerId = customer.id;
                await supabase.from(orgTable).update({ stripe_customer_id: customerId }).eq('id', academyId);
            }

            const clientUrl = process.env.CLIENT_URL || 'https://soccercircular.com';
            
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [
                    newPlan.stripe_price_id ? {
                        price: newPlan.stripe_price_id,
                        quantity: 1,
                    } : {
                        price_data: {
                            currency: newPlan.currency?.toLowerCase() || 'usd',
                            product_data: {
                                name: `${newPlan.name} Plan`,
                                description: `Subscription upgrade to ${newPlan.name}`,
                            },
                            unit_amount: Math.round(Number(newPlan.price) * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${clientUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${clientUrl}/subscription/cancel`,
                metadata: {
                    orgId: academyId,
                    planId: newPlanId,
                    type: newPlan.target_type
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Redirecting to checkout...',
                url: session.url
            });
        }

        // 3. Manual Upgrade logic (for CASH or Free plans)
        const subTable = isAgencyPlan ? 'agency_subscriptions' : 'academy_subscriptions';
        const idColumn = isAgencyPlan ? 'agency_id' : 'academy_id';

        const { data: currentSubscription } = await supabase
            .from(subTable)
            .select('*, subscription_plans(name)')
            .eq(idColumn, academyId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        if (currentSubscription) {
            await supabase
                .from(subTable)
                .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                .eq('id', currentSubscription.id);
        }

        const newSubscriptionId = uuidv4();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

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

        if (createSubError) throw new Error(`Failed to create new subscription: ${createSubError.message}`);

        // Log history
        await supabase.from('subscription_history').insert({
            subscription_id: newSubscriptionId,
            action: currentSubscription ? 'UPGRADED' : 'CREATED',
            old_plan_id: currentSubscription?.plan_id || null,
            new_plan_id: newPlanId,
            notes: currentSubscription ? `Plan upgraded to ${newPlan.name}` : `Initial subscription created`
        });

        // Create payment record
        await supabase.from('subscription_payments').insert({
            id: uuidv4(),
            subscription_id: newSubscriptionId,
            amount: newPlan.price,
            currency: 'USD',
            payment_method: (paymentMethod || 'CASH'),
            payment_reference: (paymentReference || 'DASHBOARD_UPGRADE'),
            status: paymentMethod === 'CASH' ? 'PENDING' : 'COMPLETED',
            notes: notes
        });

        return res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: {
                subscription: {
                    id: newSubscription.id,
                    planName: newPlan.name,
                    status: newSubscription.status
                }
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
