import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from '../../server/index.js';

// Initialize the Express app outside of the handler to allow for warm starts
const app = createServer();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[VERCEL] Handling request:', req.method, req.url);
    
    // Express app is a request listener function (req, res) => void
    // It handles the response automatically
    return app(req, res);
}