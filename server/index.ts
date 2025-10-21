import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleLogin,
  handleRegisterSchool,
  handleRegisterSuperAdmin,
  handleListSuperAdmins,
  handleDeleteSuperAdmin,
  handleCreateAdminUser
} from "./routes/auth";
import {
  handleGetDashboardStats
} from "./routes/dashboard";
import notificationsRouter from "./routes/notifications";
import supportRouter from "./routes/support";
import databaseRouter from "./routes/database";
import setupRouter from "./routes/setup";

export function createServer() {
  console.log("Creating Express server...");
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/register-school", handleRegisterSchool);
  app.post("/api/auth/register-superadmin", handleRegisterSuperAdmin);
  
  // Admin Management routes
  app.post("/api/admin/create-user", handleCreateAdminUser);
  
  // Super Admin Management routes
  app.get("/api/auth/list-superadmins", handleListSuperAdmins);
  app.delete("/api/auth/delete-superadmin/:userId", handleDeleteSuperAdmin);

  // Dashboard routes
  app.get("/api/dashboard/stats", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    handleGetDashboardStats(req, res);
  });
  
  // Notifications routes
  app.use("/api/notifications", notificationsRouter);
  
  // Support routes
  app.use("/api/support", supportRouter);
  
  // Database management routes
  app.use("/api/database", databaseRouter);

  // Setup routes
  app.use("/api/setup", setupRouter);

  return app;
}
