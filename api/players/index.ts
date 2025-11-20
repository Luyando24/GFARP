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
        // Mock players data - empty for now
        const mockPlayers = [];

        return res.status(200).json({
            success: true,
            data: mockPlayers
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            data: []
        });
    }
}
