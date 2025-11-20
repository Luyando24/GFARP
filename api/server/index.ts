import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fallback subscription plans - always available
function getFallbackPlans() {
    return [
        {
            id: 'free',
            name: 'Free Plan',
            description: 'Get started with core features for small academies.',
            price: 0,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            playerLimit: 25,
            storageLimit: 1024,
            features: [
                'Basic player management',
                'Limited storage',
                'Community support'
            ],
            isActive: true,
            isFree: true,
            sortOrder: 1
        },
        {
            id: 'basic',
            name: 'Basic Plan',
            description: 'Essential tools for growing academies.',
            price: 19.99,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            playerLimit: 100,
            storageLimit: 5120,
            features: [
                'Advanced player tracking',
                'Priority support',
                'Expanded storage'
            ],
            isActive: true,
            isFree: false,
            sortOrder: 2
        },
        {
            id: 'pro',
            name: 'Pro Plan',
            description: 'Professional features for established academies.',
            price: 49.99,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            playerLimit: 500,
            storageLimit: 20480,
            features: [
                'Advanced analytics',
                'Priority support',
                'High storage limits'
            ],
            isActive: true,
            isFree: false,
            sortOrder: 3
        },
        {
            id: 'elite',
            name: 'Elite Plan',
            description: 'All features unlocked for large academies.',
            price: 99.99,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            playerLimit: 2000,
            storageLimit: 51200,
            features: [
                'Full analytics suite',
                'Dedicated support',
                'Maximum storage limits'
            ],
            isActive: true,
            isFree: false,
            sortOrder: 4
        }
    ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Request received:', req.method, req.url);

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // For now, always return fallback plans
    // This ensures the registration flow works immediately
    console.log('[VERCEL] Returning fallback subscription plans');

    return res.status(200).json({
        success: true,
        data: getFallbackPlans()
    });
}