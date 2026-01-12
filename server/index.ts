import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import authRouter, {
  handleLogin,
  handleRegisterSchool,
  handleRegisterSuperAdmin,
  handleListSuperAdmins,
  handleDeleteSuperAdmin,
  handleListStaffUsers
} from "./routes/auth.js";
import {
  handleGetDashboardStats,
  handleGetNewAccounts,
  handleGetCountryDistribution,
  handleGetFinancialGrowth,
  handleGetAdminTransactions
} from "./routes/dashboard.js";
import {
  handleGetAcademyDashboardStats
} from "./routes/academy-dashboard.js";
import notificationsRouter from "./routes/notifications.js";
import supportRouter from "./routes/support.js";
import databaseRouter from "./routes/database.js";
import setupRouter from "./routes/setup.js";
import setupPlayerDbRouter from "./routes/setup-player-db.js";
import individualPlayersRouter from "./routes/individual-players.js";
import systemSettingsRouter from "./routes/system-settings.js";
import academyRouter from "./routes/academy.js";
import footballAuthRouter from "./routes/football-auth.js";
import footballPlayersRouter from "./routes/football-players.js";
import transfersRouter from "./routes/transfers.js";
import financialTransactionsRouter from "./routes/financial-transactions.js";
import financialRouter from "./routes/financial.js";
import invoicesRouter from "./routes/invoices.js";
import fifaComplianceRouter from "./routes/fifa-compliance.js";
import complianceDocumentsRouter from "./routes/compliance-documents.js";
import subscriptionRouter from "./routes/subscription-management.js";
import stripePaymentsRouter from "./routes/stripe-payments.js";
import stripeWebhooksRouter from "./routes/stripe-webhooks.js";
import stripeAdminRouter from "./routes/stripe-admin.js";
import adminSalesRouter from "./routes/admin-sales.js";
import adminDiscountsRouter from "./routes/admin-discounts.js";
import uploadsRouter from "./routes/uploads.js";
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
  console.log("[SERVER] Express app instantiated");

  // Middleware
  app.use(cors());
  console.log("[SERVER] CORS middleware added");

  // Stripe webhooks need raw body, so add this before express.json()
  app.use("/api/stripe/webhooks", express.raw({ type: 'application/json' }), stripeWebhooksRouter);
  console.log("[SERVER] Stripe webhooks route added");

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  console.log("[SERVER] Body parsing middleware added");

  // Health check routes
  app.get("/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/demo", handleDemo);
  console.log("[SERVER] Health check routes added");

  // Prefix all API routes under /api to match client base URL
  const api = express.Router();
  console.log("[SERVER] API router created");

  // Authentication routes
  api.post("/auth/login", handleLogin);
  api.post("/auth/register-school", handleRegisterSchool);
  api.post("/auth/register-superadmin", handleRegisterSuperAdmin);
  api.get("/auth/list-superadmins", handleListSuperAdmins);
  api.delete("/auth/delete-superadmin/:userId", handleDeleteSuperAdmin);

  // Use auth router for additional endpoints
  api.use("/", authRouter);
  console.log("[SERVER] Auth routes registered");

  // Dashboard routes
  api.get("/dashboard/stats", handleGetDashboardStats);
  api.get("/dashboard/new-accounts", handleGetNewAccounts);
  api.get("/dashboard/country-distribution", handleGetCountryDistribution);
  api.get("/dashboard/financial-growth", handleGetFinancialGrowth);
  api.get("/dashboard/transactions", handleGetAdminTransactions);
  api.get("/dashboard/academy-stats", handleGetAcademyDashboardStats);
  console.log("[SERVER] Dashboard routes registered");

  // Notifications routes
  api.use("/notifications", notificationsRouter);

  // Support routes
  api.use("/support", supportRouter);

  // Database management routes
  api.use("/database", databaseRouter);

  // Setup routes
  api.use("/setup", setupRouter);
  api.use("/", setupPlayerDbRouter);

  // System settings routes
  api.use("/system-settings", systemSettingsRouter);

  // Admin Sales routes
  api.use("/admin/sales", adminSalesRouter);

  // Admin Discounts routes
  api.use("/admin/discounts", adminDiscountsRouter);

  console.log("[SERVER] Admin routes registered");

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
  
  // Generic uploads
  api.use("/uploads", uploadsRouter);

  console.log("[SERVER] Football & subscription routes registered");

  // Transfers routes
  api.use("/transfers", transfersRouter);

  // Financial transactions routes
  api.use("/financial-transactions", financialTransactionsRouter);

  // Financial summary/categories routes (for dashboard)
  api.use("/financial", financialRouter);

  // Invoices routes
  api.use("/invoices", invoicesRouter);

  // FIFA compliance routes
  api.use("/fifa-compliance", fifaComplianceRouter);
  api.use("/compliance-documents", complianceDocumentsRouter);
  console.log("[SERVER] Transfer & financial routes registered");

  // Player documents routes
  api.post("/player-documents/upload", uploadMiddleware, handleUploadPlayerDocument);
  api.get("/player-documents/:playerId", handleGetPlayerDocuments);
  api.delete("/player-documents/:documentId", handleDeletePlayerDocument);

  // Individual Players routes
  api.use("/individual-players", individualPlayersRouter);

  // Demo player documents routes (for when database is unavailable)
  api.post("/demo-player-documents/upload", demoUploadMiddleware, handleDemoUploadPlayerDocument);
  api.get("/demo-player-documents/:playerId", handleDemoGetPlayerDocuments);
  api.delete("/demo-player-documents/:documentId", handleDemoDeletePlayerDocument);
  console.log("[SERVER] Document routes registered");

  // Mount the /api router
  app.use("/api", api);
  console.log("[SERVER] API router mounted");

  // Demo file serving route (outside /api prefix)
  app.get("/demo-files/:fileId", handleServeDemoFile);

  console.log("[SERVER] ✅ Server creation completed successfully");
  return app;
}
