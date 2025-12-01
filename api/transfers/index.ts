
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
        console.error('[VERCEL] Missing Supabase environment variables');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle GET - List transfers
    if (req.method === 'GET') {
        try {
            const academyId = req.query.academyId as string;

            if (!academyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Academy ID is required'
                });
            }

            const { data: transfers, error } = await supabase
                .from('transfers')
                .select('*')
                .eq('academy_id', academyId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[VERCEL] Error fetching transfers:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch transfers',
                    error: error.message
                });
            }

            return res.status(200).json({
                success: true,
                data: transfers || []
            });
        } catch (error: any) {
            console.error('[VERCEL] Get transfers error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Handle POST - Create transfer
    if (req.method === 'POST') {
        try {
            const body = req.body;
            
            // Validate required fields
            if (!body.academy_id || !body.player_name || !body.from_club || !body.to_club) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const transferId = uuidv4();
            const now = new Date().toISOString();

            const transferData = {
                id: transferId,
                academy_id: body.academy_id,
                player_id: body.player_id || null,
                player_name: body.player_name,
                from_club: body.from_club,
                to_club: body.to_club,
                transfer_amount: body.transfer_amount || 0,
                currency: body.currency || 'USD',
                transfer_date: body.transfer_date || now,
                status: body.status || 'pending',
                transfer_type: body.transfer_type || 'permanent',
                priority: body.priority || 'medium',
                notes: body.notes || '',
                created_at: now,
                updated_at: now
            };

            const { data: createdTransfer, error } = await supabase
                .from('transfers')
                .insert(transferData)
                .select()
                .single();

            if (error) {
                console.error('[VERCEL] Create transfer error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create transfer',
                    error: error.message
                });
            }

            return res.status(201).json({
                success: true,
                data: createdTransfer,
                message: 'Transfer created successfully'
            });

        } catch (error: any) {
            console.error('[VERCEL] Create transfer error:', error);
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
