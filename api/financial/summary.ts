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
        // Mock financial summary
        const mockSummary = {
            totalRevenue: 850000,
            totalExpenses: 550000,
            netProfit: 300000,
            profitMargin: 35.3,
            monthlyGrowth: 12.5
        };

        return res.status(200).json({
            success: true,
            data: mockSummary
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
