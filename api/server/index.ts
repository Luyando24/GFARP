console.log("[VERCEL] Starting serverless wrapper initialization...");
import serverless from "serverless-http";
console.log("[VERCEL] serverless-http imported");
import { createServer } from "../../server/index.js";
console.log("[VERCEL] createServer imported");

// Wrap the Express app for Vercel serverless runtime
console.log("[VERCEL] Calling createServer()...");
const app = createServer();
console.log("[VERCEL] Express app created, wrapping with serverless-http...");
export default serverless(app);