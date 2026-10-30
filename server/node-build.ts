import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index.js";
import { closePool } from "./lib/db.js";
import * as express from "express";
import { startPlayerFeeReminderScheduler } from "./lib/player-fee-reminders.js";
import { startTrainingSessionReminderScheduler } from "./lib/training-session-reminders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createServer();
const port = process.env.PORT || 8080;

// Serve static files from the React app
const clientBuildPath = path.join(__dirname, "../spa");
app.use(express.static(clientBuildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

const server = app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: ${process.env.VITE_APP_URL || `http://localhost:${port}`}`);
  console.log(`🔧 API: ${process.env.VITE_APP_URL || `http://localhost:${port}`}/api`);
});

// Only one reminder mechanism should run per deployment. Long-running hosts
// use the in-process schedulers; serverless hosts use the platform cron that
// calls GET /api/financial-transactions/reminders/process with CRON_SECRET.
if (process.env.ENABLE_IN_PROCESS_SCHEDULERS === 'false') {
  console.log('⏱️ In-process schedulers disabled; expecting platform cron to trigger reminders');
} else {
  startPlayerFeeReminderScheduler();
  startTrainingSessionReminderScheduler();
}

// Graceful shutdown: stop accepting connections, then release the pool.
async function shutdown(signal: string) {
  console.log(`🛑 Received ${signal}, shutting down gracefully`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await closePool();
    } catch (error) {
      console.error('Error closing database pool:', error);
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
