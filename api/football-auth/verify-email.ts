import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Verification token is required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Find user with this token
        const { data: user, error: findError } = await supabase
            .from('staff_users')
            .select('id, email, academy_id')
            .eq('verification_token', token)
            .single();

        if (findError || !user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
        }

        // 2. Verify user
        const { error: updateError } = await supabase
            .from('staff_users')
            .update({
                email_verified: true,
                verification_token: null, // Clear token so it can't be reused
                is_active: true
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('[VERCEL] Verification update error:', updateError);
            return res.status(500).json({ success: false, message: 'Failed to verify account' });
        }

        // 3. Return success + token (auto login)
        // In a real app, we would generate a proper JWT here.
        // For now, we return a mock token compatible with the existing auth flow.
        
        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                token: `mock_jwt_${user.id}`,
                user: {
                    id: user.id,
                    email: user.email,
                    role: 'academy_admin',
                    academy_id: user.academy_id
                }
            }
        });

    } catch (error: any) {
        console.error('[VERCEL] Verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Verification failed',
            error: error.message
        });
    }
}
