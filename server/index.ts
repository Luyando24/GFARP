import "dotenv/config";
import { query } from "./lib/db.js";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { emailService } from "./lib/email-service.js";
import authRouter, {
  handleLogin,
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
import individualPlayersRouter from "./routes/individual-players.js";
import systemSettingsRouter, { handleGetPublicSystemSettings } from "./routes/system-settings.js";
import academyRouter from "./routes/academy.js";
import footballAuthRouter from "./routes/football-auth.js";
import footballPlayersRouter from "./routes/football-players.js";
import academyStaffRouter from "./routes/academy-staff.js";
import transfersRouter from "./routes/transfers.js";
import financialTransactionsRouter from "./routes/financial-transactions.js";
import trainingAttendanceRouter from "./routes/training-attendance.js";
import financialRouter from "./routes/financial.js";
import invoicesRouter from "./routes/invoices.js";
import fifaComplianceRouter from "./routes/fifa-compliance.js";
import complianceDocumentsRouter from "./routes/compliance-documents.js";
import subscriptionRouter from "./routes/subscription-management.js";
import stripePaymentsRouter from "./routes/stripe-payments.js";
import paymentsRouter from "./routes/payments.js";
import stripeWebhooksRouter from "./routes/stripe-webhooks.js";
import stripeAdminRouter from "./routes/stripe-admin.js";
import adminSalesRouter from "./routes/admin-sales.js";
import adminDiscountsRouter from "./routes/admin-discounts.js";
import exemptionsRouter from "./routes/exemptions.js";
import uploadsRouter from "./routes/uploads.js";
import {
  handleUploadPlayerDocument,
  handleGetPlayerDocuments,
  handleDeletePlayerDocument,
  uploadMiddleware
} from "./routes/player-documents.js";
import agenciesRouter from "./routes/agencies.js";
import sitemapRouter from "./routes/sitemap.js";
import blogsRouter from "./routes/blogs.js";
import testimonialsRouter from "./routes/testimonials.js";
import {
  authenticateToken,
  canAccessOrganizationForRequest,
  requireAdmin,
  requireSuperAdmin,
  requireRoles,
  requireAcademyOwner,
  requirePermission,
} from "./middleware/auth.js";
import { enforceMaintenanceMode } from "./middleware/maintenance.js";
import { isConfigurationError, missingProductionConfig } from "./lib/config.js";

function logProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = missingProductionConfig();
  if (missing.length > 0) {
    console.error(
      `[SERVER] Missing production configuration: ${missing.join(', ')}. ` +
        'The server will start, but requests that need these values will fail with HTTP 503.',
    );
  }
  if (!process.env.CRON_SECRET?.trim()) {
    console.warn('[SERVER] CRON_SECRET is not set; the reminder cron endpoint will reject requests.');
  }
}

const isTestEnv = () => process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTestEnv,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
});

export function createServer() {
  console.log("Creating Express server...");
  logProductionConfig();
  const app = express();
  console.log("[SERVER] Express app instantiated");

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Tests must remain hermetic and must not connect to the production database.
  if (process.env.NODE_ENV !== 'test') {
    emailService.initializeFromDatabase().catch(error => {
      console.warn('[SERVER] Failed to initialize email service from database:', error);
    });
  }

  // Middleware
  // Explicit allow-list in every environment. Same-origin is always allowed;
  // localhost is only auto-allowed outside production.
  const configuredOrigins = new Set(
    [
      ...(process.env.CORS_ORIGINS || '').split(','),
      process.env.CLIENT_URL,
      process.env.VITE_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ]
      .filter(Boolean)
      .map((origin) => String(origin).trim().replace(/\/$/, '')),
  );
  const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.use(cors((req, callback) => {
    const origin = String(req.headers.origin || '').trim().replace(/\/$/, '');
    if (!origin) {
      // Non-browser clients (curl, server-to-server) do not send Origin.
      return callback(null, { origin: true, credentials: true });
    }

    const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();
    let isSameOrigin = false;
    if (forwardedHost) {
      try {
        isSameOrigin = new URL(origin).host === forwardedHost;
      } catch {
        isSameOrigin = false;
      }
    }

    const allowed =
      isSameOrigin ||
      configuredOrigins.has(origin) ||
      (process.env.NODE_ENV !== 'production' && localhostOriginPattern.test(origin));

    if (!allowed) {
      console.warn(`[CORS] Rejected cross-origin request from ${origin}`);
    }

    callback(null, {
      origin: allowed,
      credentials: true,
    });
  }));
  console.log("[SERVER] CORS middleware added");

  // Stripe webhooks need raw body, so add this before express.json()
  app.use("/api/stripe/webhooks", express.raw({ type: 'application/json' }), stripeWebhooksRouter);
  console.log("[SERVER] Stripe webhooks route added");

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  console.log("[SERVER] Body parsing middleware added");

  // Health check routes
  app.get("/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  console.log("[SERVER] Health check routes added");

  // Prefix all API routes under /api to match client base URL
  const api = express.Router();
  console.log("[SERVER] API router created");

  // Maintenance mode is enforced server-side for every API route except the
  // explicit exemptions (admin login, public banner, Stripe webhooks, cron).
  api.use(enforceMaintenanceMode);

  // Throttle credential endpoints before any auth handler runs
  api.use("/auth/login", authLimiter);
  api.use("/auth/forgot-password", authLimiter);
  api.use("/auth/reset-password", authLimiter);
  api.use("/football-auth/academy/login", authLimiter);
  api.use("/football-auth/agency/login", authLimiter);
  api.use("/football-auth/staff/login", authLimiter);
  api.use("/football-auth/verify-email", authLimiter);
  api.use("/football-auth/academy/register", registrationLimiter);
  api.use("/football-auth/agency/register", registrationLimiter);
  api.use("/individual-players/login", authLimiter);
  api.use("/individual-players/verify-email", authLimiter);
  api.use("/individual-players/resend-verification", authLimiter);
  api.use("/individual-players/register", registrationLimiter);

  // Authentication routes
  api.post("/auth/login", handleLogin);
  api.post("/auth/register-superadmin", authenticateToken, requireSuperAdmin, handleRegisterSuperAdmin);
  api.get("/auth/list-superadmins", authenticateToken, requireSuperAdmin, handleListSuperAdmins);
  api.delete("/auth/delete-superadmin/:userId", authenticateToken, requireSuperAdmin, handleDeleteSuperAdmin);

  // Use auth router for additional endpoints
  api.use("/", authRouter);
  console.log("[SERVER] Auth routes registered");

  // Dashboard routes
  api.get("/dashboard/stats", authenticateToken, requireAdmin, handleGetDashboardStats);
  api.get("/dashboard/new-accounts", authenticateToken, requireAdmin, handleGetNewAccounts);
  api.get("/dashboard/country-distribution", authenticateToken, requireAdmin, handleGetCountryDistribution);
  api.get("/dashboard/financial-growth", authenticateToken, requireAdmin, handleGetFinancialGrowth);
  api.get("/dashboard/transactions", authenticateToken, requireAdmin, handleGetAdminTransactions);
  // Tenant dashboards (academy, agency, staff) may only read their own stats.
  api.get(
    "/dashboard/academy-stats",
    authenticateToken,
    async (req, res, next) => {
      const orgId = req.query.academyId || req.query.agencyId || req.query.orgId;
      if (!(await canAccessOrganizationForRequest(req.user, orgId))) {
        return res.status(403).json({ success: false, message: "You cannot access this organization" });
      }
      next();
    },
    handleGetAcademyDashboardStats,
  );
  console.log("[SERVER] Dashboard routes registered");

  // Notifications routes
  api.use("/notifications", authenticateToken, notificationsRouter);

  // Support routes
  api.use("/support", supportRouter);

  // Database management routes
  api.use("/database", authenticateToken, requireAdmin, databaseRouter);

  // System settings routes
  api.get("/system-settings/public", handleGetPublicSystemSettings);
  api.use("/system-settings", authenticateToken, requireAdmin, systemSettingsRouter);

  // Admin Sales routes
  api.use("/admin/sales", authenticateToken, requireAdmin, adminSalesRouter);

  // Admin Discounts routes
  api.use("/admin/discounts", adminDiscountsRouter);
  api.use("/admin/exemptions", exemptionsRouter);

  console.log("[SERVER] Admin routes registered");

  // Academy routes (commented until DB is connected)
  api.use("/academies", academyRouter);

  // Football authentication routes
  api.use("/football-auth", footballAuthRouter);

  // Football players routes
  api.use("/football-players", footballPlayersRouter);

  // Academy owner-managed team accounts (owner role only)
  api.use("/academy-staff", authenticateToken, requireRoles("academy"), academyStaffRouter);

  // Subscription routes
  api.use("/subscriptions", requireAcademyOwner, subscriptionRouter);

  // Stripe payment routes
  api.use("/stripe", requireAcademyOwner, stripePaymentsRouter);

  // Payment verification (Stripe checkout success callback)
  api.use("/payments", requireAcademyOwner, paymentsRouter);

  // Stripe admin routes
  api.use("/stripe/admin", stripeAdminRouter);
  
  // Generic uploads
  api.use("/uploads", uploadsRouter);

  // Agencies routes
  api.use("/agencies", agenciesRouter);

  console.log("[SERVER] Football & subscription routes registered");

  // Transfers routes
  api.use("/transfers", transfersRouter);

  // Financial transactions routes
  api.use("/financial-transactions", financialTransactionsRouter);

  // Academy training sessions, attendance, and player streaks
  api.use("/training-attendance", trainingAttendanceRouter);

  // Financial summary/categories routes (for dashboard)
  api.use("/financial", financialRouter);

  // Invoices routes
  api.use("/invoices", invoicesRouter);

  // FIFA compliance routes
  api.use("/fifa-compliance", fifaComplianceRouter);
  api.use("/compliance-documents", complianceDocumentsRouter);
  api.use("/blogs", blogsRouter);
  api.use("/testimonials", testimonialsRouter);
  console.log("[SERVER] Transfer & financial routes registered");

  // Player documents routes
  api.post("/player-documents/upload", authenticateToken, requirePermission('players'), uploadMiddleware, handleUploadPlayerDocument);
  api.get("/player-documents/:playerId", authenticateToken, requirePermission('players'), handleGetPlayerDocuments);
  api.delete("/player-documents/:documentId", authenticateToken, requirePermission('players'), handleDeletePlayerDocument);

  // Temporary maintenance route to check database connection and schema
  api.get("/maintenance/check-db", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await query('SELECT current_database(), inet_server_addr(), inet_client_addr()');
      const version = await query('SELECT version()');
      
      // Check academies table schema
      const academyCols = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'academies'
      `);

      // Check staff_users table schema
      const staffCols = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'staff_users'
      `);

      res.json({
        success: true,
        database: result.rows[0].current_database,
        serverAddr: result.rows[0].inet_server_addr,
        version: version.rows[0].version,
        schemas: {
          academies: academyCols.rows,
          staff_users: staffCols.rows
        },
        envHasUrl: !!(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL),
        nodeEnv: process.env.NODE_ENV
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Individual Players routes
  api.use("/individual-players", individualPlayersRouter);

  console.log("[SERVER] Document routes registered");

  // Mount the /api router
  app.use("/api", api);
  console.log("[SERVER] API router mounted");

  // Dynamic Sitemap
  app.use("/", sitemapRouter);

  // Unknown API paths must return JSON, never the SPA HTML fallback
  app.use("/api", (_req, res) => {
    res.status(404).json({ success: false, error: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error(`[SERVER] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    if (isConfigurationError(err)) {
      return res.status(503).json({
        success: false,
        code: 'CONFIGURATION_ERROR',
        message: 'The service is not fully configured. Please contact support.',
      });
    }
    const isClientError = err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large';
    res.status(isClientError ? 400 : 500).json({
      success: false,
      error: isClientError ? 'Invalid request body' : 'Internal server error',
    });
  };
  app.use(errorHandler);

  console.log("[SERVER] ✅ Server creation completed successfully");
  return app;
}
