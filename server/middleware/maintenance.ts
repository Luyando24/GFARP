import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/jwt.js';
import { query } from '../lib/db.js';

const CACHE_TTL_MS = 30_000;
let maintenanceCache = { enabled: false, expiresAt: 0 };

export function clearMaintenanceCache(): void {
  maintenanceCache = { enabled: false, expiresAt: 0 };
}

// These must stay reachable during maintenance so admins can sign in, read the
// public banner and turn maintenance off, and so Stripe/cron traffic is not lost.
const EXEMPT_PREFIXES = [
  '/auth',
  '/system-settings/public',
  '/stripe/webhooks',
  '/financial-transactions/cron',
];

function isExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function isMaintenanceEnabled(): Promise<boolean> {
  if (Date.now() < maintenanceCache.expiresAt) return maintenanceCache.enabled;

  const result = await query(
    "SELECT value FROM system_settings WHERE key = 'general.maintenanceMode' LIMIT 1",
  );
  const raw = result.rows[0]?.value;
  const normalized = String(raw ?? '').trim().replace(/^"|"$/g, '').toLowerCase();
  maintenanceCache = {
    enabled: normalized === 'true',
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return maintenanceCache.enabled;
}

function isAdminToken(token: string): boolean {
  try {
    const decoded: any = jwt.verify(token, getJwtSecret());
    const role = String(decoded?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin' || role === 'super_admin';
  } catch {
    return false;
  }
}

export const enforceMaintenanceMode: RequestHandler = async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  if (isExempt(req.path)) return next();

  let enabled = false;
  try {
    enabled = await isMaintenanceEnabled();
  } catch (error) {
    // Never take the API down because the settings table is unreadable.
    console.error('[MAINTENANCE] Could not read maintenance setting:', error);
    return next();
  }
  if (!enabled) return next();

  const token = req.header('authorization')?.split(' ')[1];
  if (token && isAdminToken(token)) return next();

  return res.status(503).json({
    success: false,
    code: 'MAINTENANCE_MODE',
    message: 'The service is temporarily unavailable for scheduled maintenance. Please try again shortly.',
  });
};
