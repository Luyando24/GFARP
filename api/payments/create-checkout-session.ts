import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
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
        const { academyId, planId, successUrl, cancelUrl, billingCycle = 'monthly' } = req.body;

        if (!academyId || !planId) {
            return res.status(400).json({
                success: false,
                message: 'Academy ID and plan ID are required'
            });
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

        // Initialize Stripe
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.error('[VERCEL] Missing Stripe secret key');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: Stripe not configured'
            });
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-10-29.clover' as any, // Use latest or matching version
            typescript: true,
        });

        // 1. Get academy details
        const { data: academy, error: academyError } = await supabase
            .from('academies')
            .select('id, name, email, stripe_customer_id')
            .eq('id', academyId)
            .single();

        if (academyError || !academy) {
            console.error('[VERCEL] Error fetching academy:', academyError);
            return res.status(404).json({
                success: false,
                message: 'Academy not found'
            });
        }

        // 2. Get plan details
        let plan;
        // Check for fallback/mock plans first (pro)
        if (planId === 'pro') {
            const fallbackPlans = [
                { id: 'pro', name: 'Pro Plan', price: 49.99 }
            ];
            plan = fallbackPlans.find(p => p.id === planId);
        } else {
            // Fetch from DB
            const { data: dbPlan, error: planError } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('id', planId)
                .single();

            if (!planError && dbPlan) {
                plan = dbPlan;
            }
        }

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        // 3. Create or get Stripe Customer
        let customerId = academy.stripe_customer_id;
        if (!customerId) {
            console.log('[VERCEL] Creating new Stripe customer');
            const customer = await stripe.customers.create({
                email: academy.email,
                name: academy.name,
                metadata: {
                    academyId: academy.id
                }
            });
            customerId = customer.id;

            // Update academy with new customer ID
            await supabase
                .from('academies')
                .update({ stripe_customer_id: customerId })
                .eq('id', academyId);
        }

        // 4. Create Checkout Session
        console.log('[VERCEL] Creating Checkout Session');

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [],
            mode: 'subscription',
            success_url: successUrl || `${req.headers.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.origin}/payment/cancel`,
            metadata: {
                academyId: academy.id,
                planId: plan.id,
                planName: plan.name,
                billingCycle
            }
        };

        // Add line item
        // Use stripe_price_id only for monthly plans if available
        if (plan.stripe_price_id && billingCycle !== 'yearly') {
            sessionConfig.line_items?.push({
                price: plan.stripe_price_id,
                quantity: 1,
            });
        } else {
            // Calculate price based on billing cycle
            let unitAmount = Math.round(plan.price * 100);
            let interval: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval = 'month';
            let priceDescription = `Subscription to ${plan.name}`;

            if (billingCycle === 'yearly') {
                interval = 'year';
                priceDescription = `Yearly Subscription to ${plan.name}`;
                
                // Check for Pro plan to apply fixed yearly pricing
                const planNameLower = plan.name.toLowerCase();
                if (planNameLower.includes('pro') || planNameLower.includes('tier 2')) {
                    unitAmount = 56900; // $569.00
                } else {
                    // Default 20% discount calculation if no specific match
                    unitAmount = Math.round(plan.price * 12 * 0.8 * 100);
                }
            }

            // Use price_data
            sessionConfig.line_items?.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${plan.name} (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
                        description: priceDescription,
                    },
                    unit_amount: unitAmount,
                    recurring: {
                        interval: interval,
                    },
                },
                quantity: 1,
            });
        }

        let session;
        try {
            session = await stripe.checkout.sessions.create(sessionConfig);
        } catch (stripeError: any) {
            // Handle invalid customer ID (e.g. from test mode vs live mode)
            if (stripeError.code === 'resource_missing' && stripeError.param === 'customer') {
                console.warn('[VERCEL] Invalid Stripe customer ID found. Creating new customer...');
                
                const newCustomer = await stripe.customers.create({
                    email: academy.email,
                    name: academy.name,
                    metadata: {
                        academyId: academy.id
                    }
                });
                
                // Update academy with new customer ID
                await supabase
                    .from('academies')
                    .update({ stripe_customer_id: newCustomer.id })
                    .eq('id', academyId);
                
                // Retry creating session with new customer ID
                sessionConfig.customer = newCustomer.id;
                session = await stripe.checkout.sessions.create(sessionConfig);
            } else {
                throw stripeError;
            }
        }

        return res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error: any) {
        console.error('[VERCEL] Create checkout session error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create checkout session',
            error: error.message
        });
    }
}
