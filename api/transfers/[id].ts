
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
        console.error('[VERCEL] Missing Supabase environment variables');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'Transfer ID is required'
        });
    }

    // Handle PUT - Update transfer
    if (req.method === 'PUT') {
        try {
            const body = req.body;
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Map fields
            if (body.player_name) updateData.player_name = body.player_name;
            if (body.from_club) updateData.from_club = body.from_club;
            if (body.to_club) updateData.to_club = body.to_club;
            if (body.transfer_amount !== undefined) updateData.transfer_amount = body.transfer_amount;
            if (body.currency) updateData.currency = body.currency;
            if (body.transfer_date) updateData.transfer_date = body.transfer_date;
            if (body.status) updateData.status = body.status;
            if (body.transfer_type) updateData.transfer_type = body.transfer_type;
            if (body.priority) updateData.priority = body.priority;
            if (body.notes !== undefined) updateData.notes = body.notes;

            const { data: updatedTransfer, error } = await supabase
                .from('transfers')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Update transfer error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update transfer',
                    error: error.message
                });
            }

            return res.status(200).json({
                success: true,
                data: updatedTransfer,
                message: 'Transfer updated successfully'
            });

        } catch (error: any) {
            console.error('[VERCEL] Update transfer error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Handle DELETE - Delete transfer
    if (req.method === 'DELETE') {
        try {
            const { error } = await supabase
                .from('transfers')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('[VERCEL] Delete transfer error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete transfer',
                    error: error.message
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Transfer deleted successfully'
            });

        } catch (error: any) {
            console.error('[VERCEL] Delete transfer error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: 'Method not allowed'
    });
}
