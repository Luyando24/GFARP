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
        // Mock dashboard stats
        const mockStats = {
            totalPlayers: 45,
            activeTransfers: 8,
            monthlyRevenue: 125000,
            recentTransfers: [
                { id: 1, player: 'John Smith', from: 'Academy A', to: 'Club B', amount: '$50,000', date: '2024-01-15', status: 'completed' },
                { id: 2, player: 'Mike Johnson', from: 'Academy C', to: 'Club D', amount: '$75,000', date: '2024-01-10', status: 'pending' }
            ],
            monthlyFinancialPerformance: [
                { month: 'Jan', revenue: 120000, expenses: 80000, profit: 40000 },
                { month: 'Feb', revenue: 125000, expenses: 85000, profit: 40000 },
                { month: 'Mar', revenue: 130000, expenses: 90000, profit: 40000 },
                { month: 'Apr', revenue: 135000, expenses: 88000, profit: 47000 },
                { month: 'May', revenue: 140000, expenses: 92000, profit: 48000 },
                { month: 'Jun', revenue: 145000, expenses: 95000, profit: 50000 }
            ]
        };

        return res.status(200).json({
            success: true,
            data: mockStats
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
