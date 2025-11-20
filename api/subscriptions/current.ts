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
        // Mock current subscription data
        const mockSubscription = {
            id: 'sub-123',
            planName: 'Professional Plan',
            status: 'active',
            price: 99,
            billingCycle: 'month',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            autoRenew: true,
            daysRemaining: 30,
            playerLimit: 50,
            storageLimit: 100,
            playerCount: 25,
            playerUsagePercentage: 50,
            storageUsed: 45,
            storageUsagePercentage: 45,
            features: [
                'Unlimited player profiles',
                'Advanced analytics',
                'Transfer management',
                'FIFA compliance tracking',
                'Priority support'
            ]
        };

        return res.status(200).json({
            success: true,
            data: {
                subscription: mockSubscription,
                limits: {
                    playerLimit: 50,
                    storageLimit: 100
                },
                usage: {
                    playerCount: 25,
                    playerUsagePercentage: 50,
                    storageUsed: 45,
                    storageUsagePercentage: 45
                }
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
