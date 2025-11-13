import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import authRouter, {
  handleLogin,
  handleRegisterSchool,
  handleRegisterSuperAdmin,
  handleListSuperAdmins,
  handleDeleteSuperAdmin,
  handleListStaffUsers
} from "./routes/auth";
import {
  handleGetDashboardStats,
  handleGetNewAccounts,
  handleGetCountryDistribution,
  handleGetFinancialGrowth
} from "./routes/dashboard.js";
import {
  handleGetAcademyDashboardStats
} from "./routes/academy-dashboard.js";
import notificationsRouter from "./routes/notifications.js";
import supportRouter from "./routes/support.js";
import databaseRouter from "./routes/database.js";
import setupRouter from "./routes/setup.js";
import systemSettingsRouter from "./routes/system-settings.js";
import academyRouter from "./routes/academy.js";
import footballAuthRouter from "./routes/football-auth.js";
import footballPlayersRouter from "./routes/football-players.js";
import transfersRouter from "./routes/transfers.js";
import financialTransactionsRouter from "./routes/financial-transactions.js";
import fifaComplianceRouter from "./routes/fifa-compliance.js";
import subscriptionRouter from "./routes/subscription-management.js";
import stripePaymentsRouter from "./routes/stripe-payments.js";
import stripeWebhooksRouter from "./routes/stripe-webhooks.js";
import stripeAdminRouter from "./routes/stripe-admin.js";
import {
  handleUploadPlayerDocument,
  handleGetPlayerDocuments,
  handleDeletePlayerDocument,
  uploadMiddleware
} from "./routes/player-documents.js";
import {
  handleDemoUploadPlayerDocument,
  handleDemoGetPlayerDocuments,
  handleDemoDeletePlayerDocument,
  handleServeDemoFile,
  uploadMiddleware as demoUploadMiddleware
} from "./routes/demo-documents.js";

export function createServer() {
  console.log("Creating Express server...");
  const app = express();

  // Middleware
  app.use(cors());
  
  // Stripe webhooks need raw body, so add this before express.json()
  app.use("/api/stripe/webhooks", express.raw({ type: 'application/json' }), stripeWebhooksRouter);
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes
  app.get("/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/demo", handleDemo);

  // Prefix all API routes under /api to match client base URL
  const api = express.Router();

  // Authentication routes
  api.post("/auth/login", handleLogin);
  api.post("/auth/register-school", handleRegisterSchool);
  api.post("/auth/register-superadmin", handleRegisterSuperAdmin);
  api.get("/auth/list-superadmins", handleListSuperAdmins);
  api.delete("/auth/delete-superadmin/:userId", handleDeleteSuperAdmin);

  // Use auth router for additional endpoints
  api.use("/", authRouter);

  // Dashboard routes
  api.get("/dashboard/stats", handleGetDashboardStats);
  api.get("/dashboard/new-accounts", handleGetNewAccounts);
  api.get("/dashboard/country-distribution", handleGetCountryDistribution);
  api.get("/dashboard/financial-growth", handleGetFinancialGrowth);
  api.get("/dashboard/academy-stats", handleGetAcademyDashboardStats);

  // Notifications routes
  api.use("/notifications", notificationsRouter);

  // Support routes
  api.use("/support", supportRouter);

  // Database management routes
  api.use("/database", databaseRouter);

  // Setup routes
  api.use("/setup", setupRouter);

  // System settings routes
  api.use("/system-settings", systemSettingsRouter);

  // Academy routes (commented until DB is connected)
  api.use("/academies", academyRouter);

  // Football authentication routes
  api.use("/football-auth", footballAuthRouter);

  // Football players routes
  api.use("/football-players", footballPlayersRouter);

  // Subscription routes
  api.use("/subscriptions", subscriptionRouter);

  // Stripe payment routes
  api.use("/stripe", stripePaymentsRouter);

  // Stripe admin routes
  api.use("/stripe/admin", stripeAdminRouter);

  // Transfers routes
  api.use("/transfers", transfersRouter);

  // Financial transactions routes
  api.use("/financial-transactions", financialTransactionsRouter);

  // FIFA compliance routes
  api.use("/fifa-compliance", fifaComplianceRouter);

  // Player documents routes
  api.post("/player-documents/upload", uploadMiddleware, handleUploadPlayerDocument);
  api.get("/player-documents/:playerId", handleGetPlayerDocuments);
  api.delete("/player-documents/:documentId", handleDeletePlayerDocument);
  
  // Demo player documents routes (for when database is unavailable)
  api.post("/demo-player-documents/upload", demoUploadMiddleware, handleDemoUploadPlayerDocument);
  api.get("/demo-player-documents/:playerId", handleDemoGetPlayerDocuments);
  api.delete("/demo-player-documents/:documentId", handleDemoDeletePlayerDocument);

  // Mount the /api router
  app.use("/api", api);

  // Demo file serving route (outside /api prefix)
  app.get("/demo-files/:fileId", handleServeDemoFile);

  return app;
}
