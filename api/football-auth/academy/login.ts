import { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    maxDuration: 10,
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });
    }

    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Mock successful login - replace with actual database check later
        // For now, accept any credentials to unblock development
        const mockAcademy = {
            id: 'academy-mock-123',
            name: email.split('@')[0] + ' Academy',
            email: email,
            location: 'London, UK',
            established: '2020',
            contactPerson: 'Director Name',
            phone: '+44 20 1234 5678',
            logo: null,
            director: {
                name: 'Director Name',
                email: email,
                phone: '+44 20 1234 5678'
            }
        };

        const mockSubscription = {
            id: 'sub-mock-123',
            planName: 'Professional Plan',
            status: 'active',
            price: 99,
            billingCycle: 'month',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            playerLimit: 50,
            storageLimit: 100
        };

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                academy: mockAcademy,
                subscription: mockSubscription,
                token: `mock-jwt-token-${Date.now()}`
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
