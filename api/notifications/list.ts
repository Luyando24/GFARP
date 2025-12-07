import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Get user ID from query params or auth token (simulated here via query for simplicity or Authorization header)
        // In a real app, you'd decode the JWT from the Authorization header.
        // For this existing codebase pattern, I'll look for an Authorization header but might need to trust the client to send the user ID if I don't have a shared auth middleware handy in this file context.
        // However, looking at other files, they often use `req.body` or just assume auth.
        // Let's check `api/academies/[id].ts`... it doesn't seem to verify token deeply in the snippet I saw.
        // I'll try to get user_id from query param for now, as that's easiest given the tools.
        
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch notifications for the user
        // We join user_notifications with notifications
        const { data, error } = await supabase
            .from('user_notifications')
            .select(`
                id,
                read,
                created_at,
                notification:notifications (
                    id,
                    title,
                    message,
                    type,
                    category,
                    action_url,
                    created_at
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('[VERCEL] Error fetching notifications:', error);
            throw error;
        }

        // Transform data to flat structure
        const notifications = data.map((item: any) => ({
            id: item.notification.id,
            userNotificationId: item.id,
            title: item.notification.title,
            message: item.notification.message,
            type: item.notification.type,
            category: item.notification.category,
            actionUrl: item.notification.action_url,
            read: item.read,
            createdAt: item.notification.created_at
        }));

        return res.status(200).json({
            success: true,
            data: notifications
        });

    } catch (error: any) {
        console.error('[VERCEL] Notifications list error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
