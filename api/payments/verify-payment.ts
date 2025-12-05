import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

// Version 2.0 - Fixed date handling and improved error handling

// Helper for safe date conversion
function safeISOString(date?: Date | number | string | null, context: string = 'unknown'): string {
    try {
        if (date === null || date === undefined) {
            console.warn(`[VERCEL] safeISOString received null/undefined in context: ${context}`);
            return new Date().toISOString();
        }

        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.error(`[VERCEL] safeISOString received invalid date in context: ${context}`, { value: date, type: typeof date });
            return new Date().toISOString();
        }
        return d.toISOString();
    } catch (e) {
        console.error(`[VERCEL] safeISOString error in context: ${context}`, e);
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
            apiVersion: '2024-06-20' as any,
            typescript: true,
        });

        // 1. Retrieve session
        console.log(`[VERCEL] Verifying session: ${sessionId}`);
        let session: Stripe.Checkout.Session;
        try {
            session = await stripe.checkout.sessions.retrieve(sessionId);
        } catch (sessionError: any) {
            console.error('[VERCEL] Error retrieving checkout session:', sessionError);
            return res.status(400).json({
                success: false,
                message: 'Failed to retrieve checkout session',
                error: sessionError.message
            });
        }

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
            .update({ status: 'CANCELLED', updated_at: safeISOString(new Date(), 'deactivate_old') })
            .eq('academy_id', academyId)
            .eq('status', 'ACTIVE');

        // 5. Create new subscription
        const subscriptionId = uuidv4();

        // Get subscription details from Stripe
        console.log('[VERCEL] Retrieving subscription details from Stripe');
        let stripeSub: any;
        try {
            stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        } catch (stripeError: any) {
            console.error('[VERCEL] Error retrieving Stripe subscription:', stripeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve subscription from Stripe',
                error: stripeError.message
            });
        }

        console.log('[VERCEL] Stripe subscription data:', JSON.stringify({
            current_period_start: stripeSub.current_period_start,
            current_period_end: stripeSub.current_period_end,
            status: stripeSub.status,
            start_date: stripeSub.start_date
        }, null, 2));

        // Validate timestamps - use start_date as fallback
        // Stripe timestamps are in seconds, Date expects milliseconds
        const nowSeconds = Math.floor(Date.now() / 1000);

        let periodStart = stripeSub.current_period_start;
        if (periodStart === null || periodStart === undefined || typeof periodStart !== 'number') {
            console.warn('[VERCEL] current_period_start invalid, trying start_date');
            periodStart = stripeSub.start_date;
        }
        if (periodStart === null || periodStart === undefined || typeof periodStart !== 'number') {
            console.warn('[VERCEL] start_date also invalid, using current time');
            periodStart = nowSeconds;
        }

        let periodEnd = stripeSub.current_period_end;
        if (periodEnd === null || periodEnd === undefined || typeof periodEnd !== 'number') {
            console.warn('[VERCEL] current_period_end invalid, defaulting to 30 days from start');
            periodEnd = periodStart + (30 * 24 * 60 * 60); // Default to 30 days if missing
        }

        console.log('[VERCEL] Calculated timestamps (seconds):', { periodStart, periodEnd });

        // Ensure they are valid numbers before conversion
        if (isNaN(periodStart) || isNaN(periodEnd)) {
            console.error('[VERCEL] Invalid timestamps after validation:', { periodStart, periodEnd });
            return res.status(500).json({
                success: false,
                message: 'Invalid subscription period dates from Stripe'
            });
        }

        // Convert to milliseconds
        const startTimestamp = Number(periodStart) * 1000;
        const endTimestamp = Number(periodEnd) * 1000;

        console.log('[VERCEL] Calculated timestamps (ms):', { startTimestamp, endTimestamp });

        // Final safety check before date conversion
        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
            console.error('[VERCEL] Timestamps became NaN during conversion');
            return res.status(500).json({
                success: false,
                message: 'Failed to convert subscription dates'
            });
        }

        const startDateStr = safeISOString(startTimestamp, 'start_date');
        const endDateStr = safeISOString(endTimestamp, 'end_date');

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
                payment_status: 'PAID',
                amount_paid: session.amount_total ? session.amount_total / 100 : 0,
                created_at: safeISOString(new Date(), 'created_at'),
                updated_at: safeISOString(new Date(), 'updated_at')
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
                created_at: safeISOString(new Date(), 'payment_created_at'),
                updated_at: safeISOString(new Date(), 'payment_updated_at')
            });

        return res.json({
            success: true,
            message: 'Payment verified and subscription activated',
            subscriptionId
        });

    } catch (error: any) {
        console.error('[VERCEL] Verify payment error:', error);
        // Log the full error stack if available
        if (error.stack) {
            console.error('[VERCEL] Error stack:', error.stack);
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message || 'Unknown error occurred'
        });
    }
}
