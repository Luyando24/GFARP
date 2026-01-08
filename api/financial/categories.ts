
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET - List categories
    if (req.method === 'GET') {
        try {
            const academyId = req.query.academyId as string;

            if (!academyId || academyId === 'undefined' || academyId === 'null') {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const { data: categories, error } = await supabase
                .from('budget_categories')
                .select('*')
                .eq('academy_id', academyId)
                .eq('is_active', true)
                .order('category_name');

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // POST - Create category
    if (req.method === 'POST') {
        try {
            const category = req.body;
            
            // Populate academy_id from query if missing
            if (!category.academy_id && req.query.academyId) {
                category.academy_id = req.query.academyId;
            }

            if (!category.academy_id) {
                return res.status(400).json({ success: false, message: 'Academy ID is required' });
            }
            if (!category.category_name) {
                return res.status(400).json({ success: false, message: 'Category name is required' });
            }
            if (category.budgeted_amount === undefined || category.budgeted_amount === null) {
                return res.status(400).json({ success: false, message: 'Budgeted amount is required' });
            }

            const { data, error } = await supabase
                .from('budget_categories')
                .insert(category)
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });
        } catch (error: any) {
            console.error('Error creating category:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
}
