import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index.js";
import * as express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createServer();
const port = process.env.PORT || 8080;

// Serve static files from the React app
const clientBuildPath = path.join(__dirname, "../spa");
app.use(express.static(clientBuildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: ${process.env.VITE_APP_URL || `http://localhost:${port}`}`);
  console.log(`🔧 API: ${process.env.VITE_APP_URL || `http://localhost:${port}`}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
