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
            const { status, limit = 10, page = 1 } = req.query;
            const offset = (Number(page) - 1) * Number(limit);

            let query = supabase
                .from('blogs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + Number(limit) - 1);

            if (status) {
                query = query.eq('status', status);
            }

            const { data, count, error } = await query;

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data,
                pagination: {
                    total: count,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil((count || 0) / Number(limit))
                }
            });
        }

        if (req.method === 'POST') {
            // TODO: Add proper auth check here (Admin only)
            // For now assuming the client sends a token and we trust it or using basic protection
            
            const body = req.body;
            
            // Basic validation
            if (!body.title || !body.content) {
                return res.status(400).json({ success: false, message: 'Title and Content are required' });
            }

            // Auto-generate slug if not provided
            const slug = body.slug || body.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');

            const { data, error } = await supabase
                .from('blogs')
                .insert({
                    title: body.title,
                    slug,
                    content: body.content,
                    excerpt: body.excerpt,
                    image_url: body.image_url,
                    author_name: body.author_name || 'Soccer Circular Team',
                    status: body.status || 'draft',
                    published_at: body.status === 'published' ? new Date().toISOString() : null,
                    seo_title: body.seo_title || body.title,
                    seo_description: body.seo_description || body.excerpt,
                    tags: body.tags || []
                })
                .select()
                .single();

            if (error) {
                // Handle unique slug error
                if (error.code === '23505') {
                    return res.status(400).json({ success: false, message: 'A blog post with this slug already exists.' });
                }
                throw error;
            }

            return res.status(201).json({
                success: true,
                data
            });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error: any) {
        console.error('[VERCEL] Blog API error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
