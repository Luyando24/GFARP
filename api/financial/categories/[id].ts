
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
    res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
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
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Category ID is required' });
    }

    // PUT - Update category
    if (req.method === 'PUT') {
        try {
            const category = req.body;
            const updateData = {
                ...category,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('budget_categories')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error: any) {
            console.error('Error updating category:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // DELETE - Delete category (soft delete)
    if (req.method === 'DELETE') {
        try {
            const { error } = await supabase
                .from('budget_categories')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Category deleted successfully'
            });
        } catch (error: any) {
            console.error('Error deleting category:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
}
