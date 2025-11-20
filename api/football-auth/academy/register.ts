import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Academy registration request received');

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
        const body = req.body;
        console.log('[VERCEL] Registration data received:', { name: body.name, email: body.email });

        // For now, return a mock successful response
        // TODO: Connect to actual database when ready
        const mockAcademy = {
            id: `academy_${Date.now()}`,
            name: body.name,
            email: body.email,
            subscriptionPlan: body.subscriptionPlan || body.selectedPlan || 'free',
            createdAt: new Date().toISOString()
        };

        console.log('[VERCEL] Mock academy created:', mockAcademy.id);

        return res.status(200).json({
            success: true,
            message: 'Academy registered successfully',
            data: {
                academy: mockAcademy,
                token: `mock_token_${Date.now()}`
            }
        });
    } catch (error: any) {
        console.error('[VERCEL] Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
}
