import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        if (req.method === 'GET') {
            const { published } = req.query;

            let query = supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            if (published === 'true') {
                query = query.eq('is_published', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });
        }

        if (req.method === 'POST') {
            const body = req.body;
            
            // Basic validation
            if (!body.customer_name || !body.content) {
                return res.status(400).json({ success: false, message: 'Name and Content are required' });
            }

            const { data, error } = await supabase
                .from('testimonials')
                .insert({
                    customer_name: body.customer_name,
                    customer_position: body.customer_position,
                    content: body.content,
                    image_url: body.image_url,
                    rating: body.rating || 5,
                    is_published: body.is_published !== undefined ? body.is_published : true
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error: any) {
        console.error('[VERCEL] Testimonials API error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
