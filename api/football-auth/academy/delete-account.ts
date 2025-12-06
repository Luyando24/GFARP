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
        const { academyId, email, password } = req.body;

        if (!academyId || !email || !password) {
            return res.status(400).json({ success: false, message: 'Academy ID, email, and password are required' });
        }

        console.log(`[VERCEL] Delete account request for academy: ${academyId}, user: ${email}`);

        // Initialize Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[VERCEL] Missing Supabase environment variables');
            throw new Error('Server configuration error');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Verify User Credentials
        const { data: user, error: userError } = await supabase
            .from('staff_users')
            .select('*')
            .eq('email', email)
            .eq('academy_id', academyId)
            .single();

        if (userError || !user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        // 2. Perform Deletion (Cascading manually to be safe)

        // Delete Compliance Documents
        const { error: docsError } = await supabase
            .from('fifa_compliance_documents')
            .delete()
            .eq('academy_id', academyId);
        
        if (docsError) console.error('Error deleting documents:', docsError);

        // Delete Transfers
        const { error: transfersError } = await supabase
            .from('transfers')
            .delete()
            .eq('academy_id', academyId);
        
        if (transfersError) console.error('Error deleting transfers:', transfersError);

        // Delete Financial Transactions
        const { error: transactionsError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('academy_id', academyId);
        
        if (transactionsError) console.error('Error deleting transactions:', transactionsError);

        // Delete Players
        const { error: playersError } = await supabase
            .from('football_players')
            .delete()
            .eq('academy_id', academyId);

        if (playersError) console.error('Error deleting players:', playersError);


        // Delete Subscriptions
        const { error: subsError } = await supabase
            .from('football_subscriptions')
            .delete()
            .eq('academy_id', academyId);

        if (subsError) console.error('Error deleting subscriptions:', subsError);

        // Delete Staff Users (including the one making the request)
        const { error: usersError } = await supabase
            .from('staff_users')
            .delete()
            .eq('academy_id', academyId);

        if (usersError) {
            console.error('Error deleting users:', usersError);
            throw new Error('Failed to delete associated users');
        }

        // Delete Academy
        const { error: academyError } = await supabase
            .from('academies')
            .delete()
            .eq('id', academyId);

        if (academyError) {
            console.error('Error deleting academy:', academyError);
            throw new Error('Failed to delete academy');
        }

        console.log(`[VERCEL] Successfully deleted academy ${academyId}`);

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error: any) {
        console.error('[VERCEL] Delete account error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}
