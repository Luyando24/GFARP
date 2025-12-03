import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
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
        const { subscriptionId, academyId, planId } = req.body;

        console.log(`[VERCEL] Verifying PayPal subscription: ${subscriptionId}`);

        if (!subscriptionId || !academyId || !planId) {
            return res.status(400).json({
                success: false,
                message: 'Subscription ID, academy ID, and plan ID are required'
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

        // Get PayPal credentials
        const paypalClientId = process.env.PAYPAL_CLIENT_ID;
        const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const paypalMode = process.env.PAYPAL_MODE || 'sandbox';

        if (!paypalClientId || !paypalClientSecret) {
            console.error('[VERCEL] Missing PayPal credentials');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: PayPal not configured'
            });
        }

        // Get PayPal API base URL
        const paypalBaseUrl = paypalMode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // 1. Get PayPal access token
        console.log('[VERCEL] Getting PayPal access token');
        const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!authResponse.ok) {
            console.error('[VERCEL] Failed to get PayPal access token');
            return res.status(500).json({
                success: false,
                message: 'Failed to authenticate with PayPal'
            });
        }

        const { access_token } = await authResponse.json();

        // 2. Verify subscription with PayPal
        console.log('[VERCEL] Verifying subscription with PayPal');
        const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!subscriptionResponse.ok) {
            console.error('[VERCEL] Failed to fetch PayPal subscription');
            return res.status(400).json({
                success: false,
                message: 'Invalid PayPal subscription'
            });
        }

        const paypalSubscription = await subscriptionResponse.json();
        console.log('[VERCEL] PayPal subscription status:', paypalSubscription.status);

        // Check if subscription is active or approved
        if (paypalSubscription.status !== 'ACTIVE' && paypalSubscription.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: `Subscription not active. Status: ${paypalSubscription.status}`
            });
        }

        // 3. Check if subscription already exists
        const { data: existingSub } = await supabase
            .from('academy_subscriptions')
            .select('id')
            .eq('paypal_subscription_id', subscriptionId)
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
        const newSubscriptionId = uuidv4();

        // Parse dates from PayPal subscription
        const startDate = new Date(paypalSubscription.start_time || paypalSubscription.create_time);
        // PayPal billing cycles - default to 30 days
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);

        console.log('[VERCEL] Creating new subscription record');
        const { error: insertError } = await supabase
            .from('academy_subscriptions')
            .insert({
                id: newSubscriptionId,
                academy_id: academyId,
                plan_id: planId,
                paypal_subscription_id: subscriptionId,
                status: 'ACTIVE',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                auto_renew: paypalSubscription.status === 'ACTIVE',
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
        console.log('[VERCEL] Recording payment');
        const paymentId = uuidv4();

        // Get amount from PayPal subscription
        const amount = paypalSubscription.billing_info?.last_payment?.amount?.value || 0;
        const currency = paypalSubscription.billing_info?.last_payment?.amount?.currency_code || 'USD';

        await supabase
            .from('subscription_payments')
            .insert({
                id: paymentId,
                subscription_id: newSubscriptionId,
                amount: parseFloat(amount),
                currency: currency.toLowerCase(),
                payment_method: 'PAYPAL',
                payment_reference: subscriptionId,
                status: 'COMPLETED',
                notes: `PayPal Subscription: ${subscriptionId}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        console.log('[VERCEL] PayPal subscription verification successful');
        return res.json({
            success: true,
            message: 'PayPal subscription verified and activated',
            subscriptionId: newSubscriptionId
        });

    } catch (error: any) {
        console.error('[VERCEL] Verify PayPal subscription error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify PayPal subscription',
            error: error.message
        });
    }
}
