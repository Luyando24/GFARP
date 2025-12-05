import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

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
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
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
            apiVersion: '2025-10-29.clover' as any,
            typescript: true,
        });

        // 1. Retrieve session
        console.log(`[VERCEL] Verifying session: ${sessionId}`);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            console.error('[VERCEL] Session not found');
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        console.log('[VERCEL] Session status:', session.payment_status);
        console.log('[VERCEL] Session metadata:', session.metadata);

        // 2. Verify payment status
        if (session.payment_status !== 'paid') {
            console.warn(`[VERCEL] Payment not paid: ${session.payment_status}`);
            return res.status(400).json({
                success: false,
                message: 'Payment not completed',
                status: session.payment_status
            });
        }

        const { academyId, planId } = session.metadata || {};

        if (!academyId || !planId) {
            console.error('[VERCEL] Missing metadata');
            return res.status(400).json({
                success: false,
                message: 'Invalid session metadata'
            });
        }

        // 3. Check if subscription already exists/processed
        // We can check by stripe_subscription_id
        const stripeSubscriptionId = session.subscription as string;
        console.log(`[VERCEL] Stripe Subscription ID: ${stripeSubscriptionId}`);

        if (!stripeSubscriptionId) {
            console.error('[VERCEL] No subscription ID in session');
            return res.status(400).json({
                success: false,
                message: 'No subscription ID found in session'
            });
        }

        const { data: existingSub } = await supabase
            .from('academy_subscriptions')
            .select('id')
            .eq('stripe_subscription_id', stripeSubscriptionId)
            .single();

        if (existingSub) {
            console.log('[VERCEL] Subscription already processed');
            return res.json({
                success: true,
                message: 'Subscription already processed',
                subscriptionId: existingSub.id
            });
        }

        // 4. Deactivate current active subscription
        console.log('[VERCEL] Deactivating old subscriptions');
        await supabase
            .from('academy_subscriptions')
            .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE');

        // 5. Create new subscription
        const subscriptionId = uuidv4();

        // Get subscription details from Stripe
        console.log('[VERCEL] Retrieving subscription details from Stripe');
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        console.log('[VERCEL] Stripe subscription data:', {
            current_period_start: stripeSub.current_period_start,
            current_period_end: stripeSub.current_period_end,
            status: stripeSub.status
        });

        // Validate timestamps
        if (!stripeSub.current_period_start || !stripeSub.current_period_end) {
            console.error('[VERCEL] Missing subscription period dates');
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription period dates from Stripe'
            });
        }

        const startDate = new Date(stripeSub.current_period_start * 1000);
        const endDate = new Date(stripeSub.current_period_end * 1000);

        // Validate dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('[VERCEL] Invalid date conversion:', { startDate, endDate });
            return res.status(400).json({
                success: false,
                message: 'Failed to parse subscription dates'
            });
        }

        console.log('[VERCEL] Creating new subscription record');
        const { error: insertError } = await supabase
            .from('academy_subscriptions')
            .insert({
                id: subscriptionId,
                academy_id: academyId,
                plan_id: planId,
                stripe_subscription_id: stripeSubscriptionId,
                status: 'ACTIVE',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                auto_renew: !stripeSub.cancel_at_period_end,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('[VERCEL] Error creating subscription:', insertError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create subscription record',
                error: insertError.message
            });
        }

        // 6. Record payment
        const paymentId = uuidv4();
        await supabase
            .from('subscription_payments')
            .insert({
                id: paymentId,
                subscription_id: subscriptionId,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency || 'usd',
                payment_method: 'CARD', // Assumed from checkout
                payment_reference: session.payment_intent as string || session.id,
                status: 'COMPLETED',
                notes: `Stripe Checkout Session: ${session.id}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        return res.json({
            success: true,
            message: 'Payment verified and subscription activated',
            subscriptionId
        });

    } catch (error: any) {
        console.error('[VERCEL] Verify payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message
        });
    }
}
