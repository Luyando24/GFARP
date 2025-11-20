import { createServer } from '../server/index.js';
import serverless from 'serverless-http';

// Create the Express app
console.log('[VERCEL] Creating Express server for serverless...');
const app = createServer();

// Wrap it with serverless-http for Vercel
console.log('[VERCEL] Wrapping Express app with serverless-http...');
const handler = serverless(app);

// Export the handler for Vercel
export default handler;