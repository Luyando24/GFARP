import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get all possible DATABASE_URL environment variables
    const envVars = {
        DATABASE_URL: process.env.DATABASE_URL || 'NOT SET',
        SUPABASE_DB_URL: process.env.SUPABASE_DB_URL || 'NOT SET',
        SUPABASE_DB_POOL_URL: process.env.SUPABASE_DB_POOL_URL || 'NOT SET',
        SUPABASE_POOLED_DATABASE_URL: process.env.SUPABASE_POOLED_DATABASE_URL || 'NOT SET',
        POSTGRES_URL: process.env.POSTGRES_URL || 'NOT SET',
        DIRECT_URL: process.env.DIRECT_URL || 'NOT SET',
    };

    // Parse connection details (mask password)
    const parseConnection = (urlStr: string) => {
        if (urlStr === 'NOT SET') return null;
        try {
            const u = new URL(urlStr);
            return {
                hostname: u.hostname,
                port: u.port,
                username: u.username,
                database: u.pathname.slice(1),
                password_hint: u.password ? `${u.password.substring(0, 3)}...${u.password.slice(-3)}` : 'none',
                ssl: u.searchParams.get('sslmode') || 'not specified'
            };
        } catch (e) {
            return { error: 'Invalid URL format' };
        }
    };

    const connectionDetails: any = {};
    Object.entries(envVars).forEach(([key, value]) => {
        connectionDetails[key] = {
            value: value === 'NOT SET' ? 'NOT SET' : 'SET',
            details: parseConnection(value)
        };
    });

    return res.status(200).json({
        message: 'Database Environment Variables Debug Info',
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString(),
        connectionDetails
    });
}
