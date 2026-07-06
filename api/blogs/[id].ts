import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: 'ID is required' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Handle GET - Fetch blog by ID
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        message: 'Blog post not found'
                    });
                }
                throw error;
            }

            return res.status(200).json({
                success: true,
                data
            });
        }

        if (req.method === 'PUT') {
            const body = req.body;

            // Updates object
            const updates: any = {
                updated_at: new Date().toISOString()
            };

            if (body.title) updates.title = body.title;
            if (body.content) updates.content = body.content;
            if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
            if (body.slug) {
                let cleanSlug = body.slug.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)+/g, '');
                updates.slug = await getUniqueSlug(supabase, cleanSlug, id as string);
            }
            if (body.image_url !== undefined) updates.image_url = body.image_url;
            if (body.author_name) updates.author_name = body.author_name;
            if (body.seo_title) updates.seo_title = body.seo_title;
            if (body.seo_description) updates.seo_description = body.seo_description;
            if (body.tags) updates.tags = body.tags;

            if (body.status) {
                updates.status = body.status;
                if (body.status === 'published') {
                    // Only set published_at if it wasn't already set? Or update it? 
                    // Usually we keep original publish date unless explicitly changed.
                    // For now, let's set it if not present.
                    // Actually simpler: let client handle it or just set if transitioning to published.
                    // We'll rely on client passing published_at if they want to control it, or we default.
                    if (!body.published_at) {
                        // Check if already published to avoid resetting date
                        const { data: current } = await supabase.from('blogs').select('published_at').eq('id', id).single();
                        if (!current?.published_at) {
                            updates.published_at = new Date().toISOString();
                        }
                    }
                }
            }

            const { data, error } = await supabase
                .from('blogs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase
                .from('blogs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Blog post deleted'
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

async function getUniqueSlug(supabase: any, baseSlug: string, excludeId?: string): Promise<string> {
    let query = supabase
        .from('blogs')
        .select('id, slug')
        .eq('slug', baseSlug);
    
    if (excludeId) {
        query = query.neq('id', excludeId);
    }
    
    const { data: exactMatch, error: exactError } = await query;
    if (exactError) throw exactError;
    
    if (!exactMatch || exactMatch.length === 0) {
        return baseSlug;
    }
    
    let suffixQuery = supabase
        .from('blogs')
        .select('id, slug')
        .like('slug', `${baseSlug}-%`);
        
    if (excludeId) {
        suffixQuery = suffixQuery.neq('id', excludeId);
    }
    
    const { data: matches, error: suffixError } = await suffixQuery;
    if (suffixError) throw suffixError;
    
    if (!matches || matches.length === 0) {
        return `${baseSlug}-1`;
    }
    
    const suffixes = matches
        .map((m: any) => {
            const parts = m.slug.split('-');
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart, 10);
            return isNaN(num) ? 0 : num;
        })
        .filter((num: number) => num > 0);
        
    const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 0;
    return `${baseSlug}-${maxSuffix + 1}`;
}
