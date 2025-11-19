import serverless from "serverless-http";
import { createServer } from "../../server/index";

// Wrap the Express app for Vercel serverless runtime
const app = createServer();
export default serverless(app);