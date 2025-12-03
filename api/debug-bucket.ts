import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const playerDocsBucket = buckets.find(b => b.name === 'player-documents');

        return res.status(200).json({
            buckets: buckets.map(b => b.name),
            hasPlayerDocumentsBucket: !!playerDocsBucket,
            bucketDetails: playerDocsBucket
        });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
