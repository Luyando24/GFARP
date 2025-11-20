import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Find user by email
        const { data: user, error: userError } = await supabase
            .from('staff_users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 2. Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 3. Get Academy Details
        const { data: academy, error: academyError } = await supabase
            .from('academies')
            .select('*')
            .eq('id', user.academy_id)
            .single();

        if (academyError || !academy) {
            return res.status(404).json({ success: false, message: 'Academy not found' });
        }

        // 4. Mock Subscription (until subscription table is fully integrated)
        const mockSubscription = {
            id: 'sub-mock-' + academy.id,
            planName: 'Professional Plan', // Default for now
            status: 'active',
            price: 99,
            billingCycle: 'month',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            playerLimit: 50,
            storageLimit: 100
        };

        // 5. Return Success
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                academy: {
                    ...academy,
                    role: user.role
                },
                subscription: mockSubscription,
                token: `mock_jwt_${user.id}` // In real app, generate JWT here
            }
        });

    } catch (error: any) {
        console.error('[VERCEL] Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
}
