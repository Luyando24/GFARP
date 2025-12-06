import type { VercelRequest, VercelResponse } from '@vercel/node';
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

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
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

        // Get start of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Run queries in parallel for efficiency
        const [
            { count: totalCompliances, error: totalError },
            { count: pendingReviews, error: pendingError },
            { count: approvedThisMonth, error: approvedError },
            { count: flaggedIssues, error: flaggedError },
            { data: recentReviews, error: reviewsError }
        ] = await Promise.all([
            // Total compliances (documents)
            supabase
                .from('fifa_compliance_documents')
                .select('*', { count: 'exact', head: true }),
            
            // Pending reviews
            supabase
                .from('fifa_compliance_documents')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending'),

            // Approved this month
            supabase
                .from('fifa_compliance_documents')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'verified')
                .gte('upload_date', startOfMonth),

            // Flagged issues (rejected)
            supabase
                .from('fifa_compliance_documents')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'rejected'),

            // Recent completed reviews for average time calculation
            supabase
                .from('fifa_compliance_documents')
                .select('upload_date, updated_at')
                .in('status', ['verified', 'rejected'])
                .order('updated_at', { ascending: false })
                .limit(50)
        ]);

        if (totalError || pendingError || approvedError || flaggedError) {
            console.error('[VERCEL] Error fetching compliance stats:', { totalError, pendingError, approvedError, flaggedError });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch compliance statistics'
            });
        }

        // Calculate average review time
        let averageReviewTime = "N/A";
        if (recentReviews && recentReviews.length > 0) {
            const totalTimeMs = recentReviews.reduce((acc: number, doc: any) => {
                const start = new Date(doc.upload_date).getTime();
                const end = new Date(doc.updated_at).getTime();
                // Ensure end > start (sanity check)
                const diff = Math.max(0, end - start);
                return acc + diff;
            }, 0);
            
            const avgMs = totalTimeMs / recentReviews.length;
            const avgHours = avgMs / (1000 * 60 * 60);
            const avgDays = avgHours / 24;
            
            if (avgDays >= 1) {
                averageReviewTime = `${avgDays.toFixed(1)} days`;
            } else if (avgHours >= 1) {
                averageReviewTime = `${avgHours.toFixed(1)} hours`;
            } else {
                averageReviewTime = "< 1 hour";
            }
        }

        return res.json({
            success: true,
            data: {
                totalCompliances: totalCompliances || 0,
                pendingReviews: pendingReviews || 0,
                approvedThisMonth: approvedThisMonth || 0,
                flaggedIssues: flaggedIssues || 0,
                averageReviewTime
            }
        });

    } catch (error: any) {
        console.error('[VERCEL] Compliance stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance statistics',
            error: error.message
        });
    }
}
