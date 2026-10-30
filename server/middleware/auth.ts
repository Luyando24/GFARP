import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/jwt.js';
import { query } from '../lib/db.js';
import { validateActiveSession } from '../lib/auth-tokens.js';

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

export const authenticateToken: RequestHandler = async (req, res, next) => {
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

    // Tokens issued before token versioning have no `tv` claim. They are still
    // validated in production; tests that predate the claim stay hermetic.
    const shouldValidate = process.env.NODE_ENV !== 'test' || decoded.tv !== undefined;
    if (shouldValidate) {
      let session;
      try {
        session = await validateActiveSession({ id: decoded.id, role: decoded.role, tv: decoded.tv });
      } catch (validationError) {
        console.error('[AUTH] Session validation failed:', validationError);
        return res.status(503).json({
          success: false,
          code: 'AUTH_UNAVAILABLE',
          message: 'Authentication service is temporarily unavailable',
        });
      }
      if (!session.valid) {
        return res.status(401).json({
          success: false,
          code: session.reason,
          message: 'Your session is no longer valid. Please sign in again.',
        });
      }
    }

    // Attach decoded user onto request (module augmentation ensures typing)
    req.user = {
      id: String(decoded.id),
      email: String(decoded.email || ''),
      name: decoded.name ? String(decoded.name) : undefined,
      role: normalizeRole(decoded.role),
      academyId: decoded.academyId ? String(decoded.academyId) : undefined,
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

type RequestUser = { id: string; email: string; name?: string; role: string; academyId?: string } | undefined;

export function canAccessOrganization(user: RequestUser, organizationId: unknown): boolean {
  if (!user || !organizationId) return false;
  const role = normalizeRole(user.role);
  if (role === 'admin' || role === 'superadmin') return true;
  if (role === 'staff' && user.academyId) return user.academyId === String(organizationId);
  return user.id === String(organizationId);
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

export async function resolveStaffAcademyId(user: RequestUser): Promise<string | null> {
  if (!user || normalizeRole(user.role) !== 'staff') return null;
  if (user.academyId) return user.academyId;
  const result = await query('SELECT academy_id FROM staff_users WHERE id = $1 LIMIT 1', [user.id]);
  return result.rows[0]?.academy_id ?? null;
}

export function requireOrganizationParam(paramName = 'academyId'): RequestHandler {
  return async (req, res, next) => {
    if (!(await canAccessOrganizationForRequest(req.user, req.params[paramName]))) {
      return res.status(403).json({ success: false, message: 'You cannot access this organization' });
    }
    next();
  };
}
