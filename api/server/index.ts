import serverless from "serverless-http";
import { createServer } from "../../server/index.js";

// Wrap the Express app for Vercel serverless runtime
const app = createServer();
export default serverless(app);