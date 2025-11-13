import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 8080;

// Resolve ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve built SPA in production from dist/spa
const spaDir = path.resolve(__dirname, "../spa");
app.use(express.static(spaDir));

// Catch-all for non-API routes to return SPA index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(spaDir, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
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
