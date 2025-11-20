import { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Mock subscription history
        const mockHistory = [
            {
                id: 'hist-1',
                action: 'subscription_created',
                planName: 'Professional Plan',
                createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Initial subscription'
            },
            {
                id: 'hist-2',
                action: 'plan_upgraded',
                planName: 'Professional Plan',
                oldPlanName: 'Basic Plan',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Upgraded to professional plan'
            }
        ];

        return res.status(200).json({
            success: true,
            data: {
                history: mockHistory
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            data: {
                history: []
            }
        });
    }
}
