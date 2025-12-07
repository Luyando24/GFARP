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
        const { userNotificationId } = req.body;

        if (!userNotificationId) {
            return res.status(400).json({ success: false, message: 'Notification ID is required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .from('user_notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', userNotificationId);

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Marked as read'
        });

    } catch (error: any) {
        console.error('[VERCEL] Mark read error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
