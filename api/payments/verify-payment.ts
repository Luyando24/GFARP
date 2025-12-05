import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

// Helper for safe date conversion
function safeISOString(date?: Date | number | string | null): string {
    try {
        if (!date) return new Date().toISOString();
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.error('[VERCEL] safeISOString received invalid date:', date);
            return new Date().toISOString();
        }
        return d.toISOString();
    } catch (e) {
        console.error('[VERCEL] safeISOString error:', e);
        return new Date().toISOString();
    }
}

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
        console.log('[VERCEL] Session object:', {
            id: session.id,
            mode: session.mode,
            subscription: session.subscription,
            subscription_type: typeof session.subscription
        });

        const stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        console.log(`[VERCEL] Stripe Subscription ID: ${stripeSubscriptionId}`);

        if (!stripeSubscriptionId) {
            console.error('[VERCEL] No subscription ID in session');
            console.error('[VERCEL] Full session for debugging:', JSON.stringify(session, null, 2));
            return res.status(400).json({
                success: false,
                message: 'No subscription ID found in session. Please ensure the payment was configured as a subscription.',
                error: 'MISSING_SUBSCRIPTION_ID'
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
            .update({ status: 'CANCELLED', updated_at: safeISOString() })
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE');

        // 5. Create new subscription
        const subscriptionId = uuidv4();

        // Get subscription details from Stripe
        console.log('[VERCEL] Retrieving subscription details from Stripe');
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;

        console.log('[VERCEL] Stripe subscription data:', {
            current_period_start: stripeSub.current_period_start,
            current_period_end: stripeSub.current_period_end,
            status: stripeSub.status
        });

        // Validate timestamps - use start_date as fallback
        const periodStart = stripeSub.current_period_start || stripeSub.start_date || Math.floor(Date.now() / 1000);
        const periodEnd = stripeSub.current_period_end || (periodStart + 30 * 24 * 60 * 60); // Default to 30 days if missing

        const startDateStr = safeISOString(periodStart * 1000);
        const endDateStr = safeISOString(periodEnd * 1000);

        console.log('[VERCEL] Date conversion successful:', { startDateStr, endDateStr });

        console.log('[VERCEL] Creating new subscription record');
        const { error: insertError } = await supabase
            .from('academy_subscriptions')
            .insert({
                id: subscriptionId,
                academy_id: academyId,
                plan_id: planId,
                stripe_subscription_id: stripeSubscriptionId,
                status: 'ACTIVE',
                start_date: startDateStr,
                end_date: endDateStr,
                auto_renew: !stripeSub.cancel_at_period_end,
                created_at: safeISOString(),
                updated_at: safeISOString()
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
                created_at: safeISOString(),
                updated_at: safeISOString()
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
