import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/jwt.js';
import { query } from '../lib/db.js';

export type AppRole =
  | 'superadmin'
  | 'admin'
  | 'academy'
  | 'agency_admin'
  | 'staff'
  | 'individual_player'
  | 'student';

export function normalizeRole(role: unknown): string {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  if (normalized === 'academy_admin') return 'academy';
  if (normalized === 'agency' || normalized === 'agencyadmin') return 'agency_admin';
  return normalized;
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded: any = jwt.verify(token, getJwtSecret());
    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ success: false, message: 'Invalid access token' });
    }
    // Attach decoded user onto request (module augmentation ensures typing)
    req.user = {
      id: String(decoded.id),
      email: String(decoded.email || ''),
      name: decoded.name ? String(decoded.name) : undefined,
      role: normalizeRole(decoded.role),
    };
    next();
  } catch (err: any) {
    console.error('[AUTH DEBUG] Token verification failed:', err.message);
    if (String(err?.message || '').startsWith('JWT_SECRET')) {
      return res.status(503).json({
        success: false,
        code: 'AUTH_CONFIGURATION_ERROR',
        message: 'Authentication service is temporarily unavailable'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: err.message
    });
  }
};

export function requireRoles(...allowedRoles: AppRole[]): RequestHandler {
  const allowed = new Set(allowedRoles.map(normalizeRole));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!req.user || !allowed.has(role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

export const requireAdmin = requireRoles('admin', 'superadmin');
export const requireSuperAdmin = requireRoles('superadmin');

type RequestUser = { id: string; email: string; name?: string; role: string } | undefined;

export function canAccessOrganization(user: RequestUser, organizationId: unknown): boolean {
  if (!user || !organizationId) return false;
  const role = normalizeRole(user.role);
  return role === 'admin' || role === 'superadmin' || user.id === String(organizationId);
}

export async function canAccessOrganizationForRequest(
  user: RequestUser,
  organizationId: unknown,
): Promise<boolean> {
  if (canAccessOrganization(user, organizationId)) return true;
  if (!user || normalizeRole(user.role) !== 'staff') return false;

  const result = await query('SELECT academy_id FROM staff_users WHERE id = $1 LIMIT 1', [user.id]);
  return result.rows[0]?.academy_id === String(organizationId || '');
}

export function requireOrganizationParam(paramName = 'academyId'): RequestHandler {
  return async (req, res, next) => {
    if (!(await canAccessOrganizationForRequest(req.user, req.params[paramName]))) {
      return res.status(403).json({ success: false, message: 'You cannot access this organization' });
    }
    next();
  };
}
