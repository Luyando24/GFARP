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
        // Mock financial categories
        const mockCategories = [
            { id: 1, name: 'Player Salaries', amount: 250000, percentage: 45 },
            { id: 2, name: 'Facility Costs', amount: 120000, percentage: 22 },
            { id: 3, name: 'Training Equipment', amount: 80000, percentage: 15 },
            { id: 4, name: 'Marketing', amount: 50000, percentage: 9 },
            { id: 5, name: 'Other', amount: 50000, percentage: 9 }
        ];

        return res.status(200).json({
            success: true,
            data: mockCategories
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
