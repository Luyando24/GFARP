
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

    // Handle GET - Search players
    if (req.method === 'GET') {
        try {
            const query = req.query.q as string;
            const academyId = req.query.academyId as string;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            // Decrypt function
            const decrypt = (value: any) => {
                if (!value) return '';
                if (typeof value === 'string' && value.startsWith('\\x')) {
                    return Buffer.from(value.slice(2), 'hex').toString('utf8');
                }
                if (Buffer.isBuffer(value)) {
                    return value.toString('utf8');
                }
                if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
                    return Buffer.from(value).toString('utf8');
                }
                if (typeof value === 'string') return value;
                return String(value);
            };

            // Fetch players from the academy (optimizing by selecting all for this academy then filtering)
            // In a real production app with encryption, you might need a better search strategy
            // like a separate search index or blind indexing. For now, we fetch and filter.
            
            let queryBuilder = supabase
                .from('players')
                .select('*');
                
            if (academyId) {
                queryBuilder = queryBuilder.eq('academy_id', academyId);
            }
            
            const { data: players, error } = await queryBuilder;

            if (error) {
                console.error('[VERCEL] Error searching players:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to search players',
                    error: error.message
                });
            }

            // Filter and map results
            const searchResults = players
                .map(player => {
                    const firstName = decrypt(player.first_name_cipher);
                    const lastName = decrypt(player.last_name_cipher);
                    const fullName = `${firstName} ${lastName}`.trim();
                    const currentClub = decrypt(player.current_club_cipher);

                    return {
                        id: player.id,
                        name: fullName,
                        firstName,
                        lastName,
                        position: player.position,
                        currentClub: currentClub,
                        imageUrl: player.photo_url // Assuming photo_url is stored directly or needs retrieval
                    };
                })
                .filter(player => 
                    player.name.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, limit);

            return res.status(200).json({
                success: true,
                data: searchResults
            });

        } catch (error: any) {
            console.error('[VERCEL] Search players error:', error);
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
