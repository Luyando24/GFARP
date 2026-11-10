import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, hashPassword } from '../lib/db.js';
import { revokeAccountSessions } from '../lib/auth-tokens.js';
import {
  ACADEMY_STAFF_ROLES,
  isAcademyStaffRole,
  isStaffPermission,
  normalizeStaffPermissions,
  type StaffPermission,
} from '../../shared/permissions.js';

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function sendError(res: Response, status: number, message: string, code?: string) {
  return res.status(status).json({ success: false, ...(code ? { code } : {}), message });
}

function mapStaff(row: any) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    permissions: normalizeStaffPermissions(row.permissions),
    isActive: row.is_active,
    lastLogin: row.last_login,
    createdAt: row.created_at,
  };
}

function readPermissions(value: unknown): StaffPermission[] | string {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return 'Permissions must be a list.';
  if (value.some((entry) => !isStaffPermission(entry))) {
    return 'One or more permissions are not recognised.';
  }
  return normalizeStaffPermissions(value);
}

async function emailBelongsToAnotherAccount(email: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM academies WHERE LOWER(email) = $1
     UNION ALL
     SELECT 1 FROM staff_users WHERE LOWER(email) = $1
     LIMIT 1`,
    [email],
  );
  return result.rows.length > 0;
}

// GET /api/academy-staff
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, role, permissions, is_active, last_login, created_at
         FROM staff_users
        WHERE academy_id = $1
        ORDER BY LOWER(first_name), LOWER(last_name), LOWER(email)`,
      [req.user!.id],
    );
    res.json({ success: true, data: { staff: result.rows.map(mapStaff) } });
  } catch (error) {
    console.error('[AcademyStaff] List failed:', error);
    sendError(res, 500, 'Unable to load the team');
  }
});

// POST /api/academy-staff
router.post('/', async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const email = String(req.body?.email || '').toLowerCase().trim();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'academy_admin').trim().toLowerCase();
    const permissions = readPermissions(req.body?.permissions);

    if (!firstName || !lastName) {
      return sendError(res, 400, 'First name and last name are required.');
    }
    if (!EMAIL_PATTERN.test(email)) {
      return sendError(res, 400, 'Enter a valid email address.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return sendError(res, 400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (!isAcademyStaffRole(role)) {
      return sendError(res, 400, 'Choose a valid staff role.');
    }
    if (typeof permissions === 'string') {
      return sendError(res, 400, permissions);
    }
    if (await emailBelongsToAnotherAccount(email)) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO staff_users (
         id, academy_id, email, password_hash, role, first_name, last_name, permissions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, role, permissions, is_active, last_login, created_at`,
      [uuidv4(), req.user!.id, email, passwordHash, role, firstName, lastName, permissions],
    );

    res.status(201).json({ success: true, data: { staff: mapStaff(result.rows[0]) } });
  } catch (error: any) {
    console.error('[AcademyStaff] Create failed:', error);
    if (error?.code === '23505') {
      return sendError(res, 409, 'An account with this email already exists.');
    }
    sendError(res, 500, 'Unable to add this team member');
  }
});

// PUT /api/academy-staff/:staffId
router.put('/:staffId', async (req, res) => {
  try {
    const staffId = String(req.params.staffId || '');
    const existing = await query(
      `SELECT id, role, permissions, is_active
         FROM staff_users
        WHERE id = $1 AND academy_id = $2
        LIMIT 1`,
      [staffId, req.user!.id],
    );
    if (existing.rows.length === 0) {
      return sendError(res, 404, 'Team member not found.');
    }
    const current = existing.rows[0];

    const updates: string[] = [];
    const values: any[] = [staffId, req.user!.id];
    const addUpdate = (column: string, value: unknown) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body?.firstName !== undefined) {
      const firstName = String(req.body.firstName || '').trim();
      if (!firstName) return sendError(res, 400, 'First name is required.');
      addUpdate('first_name', firstName);
    }
    if (req.body?.lastName !== undefined) {
      const lastName = String(req.body.lastName || '').trim();
      if (!lastName) return sendError(res, 400, 'Last name is required.');
      addUpdate('last_name', lastName);
    }
    if (req.body?.role !== undefined) {
      const role = String(req.body.role || '').trim().toLowerCase();
      if (!isAcademyStaffRole(role)) return sendError(res, 400, 'Choose a valid staff role.');
      addUpdate('role', role);
    }
    if (req.body?.isActive !== undefined) {
      addUpdate('is_active', Boolean(req.body.isActive));
    }
    if (req.body?.permissions !== undefined) {
      const permissions = readPermissions(req.body.permissions);
      if (typeof permissions === 'string') return sendError(res, 400, permissions);
      addUpdate('permissions', permissions);
    }
    if (req.body?.password !== undefined && req.body.password !== '') {
      const password = String(req.body.password);
      if (password.length < MIN_PASSWORD_LENGTH) {
        return sendError(res, 400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      addUpdate('password_hash', await hashPassword(password));
    }

    if (updates.length === 0) {
      return sendError(res, 400, 'Nothing to update.');
    }

    const result = await query(
      `UPDATE staff_users
          SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $1 AND academy_id = $2
        RETURNING id, email, first_name, last_name, role, permissions, is_active, last_login, created_at`,
      values,
    );

    const securityChanged =
      req.body?.role !== undefined ||
      req.body?.isActive !== undefined ||
      req.body?.permissions !== undefined ||
      (req.body?.password !== undefined && req.body.password !== '');
    if (securityChanged) {
      await revokeAccountSessions('staff', staffId);
    }

    res.json({ success: true, data: { staff: mapStaff(result.rows[0]), reauthRequired: securityChanged } });
  } catch (error) {
    console.error('[AcademyStaff] Update failed:', error);
    sendError(res, 500, 'Unable to update this team member');
  }
});

// DELETE /api/academy-staff/:staffId
router.delete('/:staffId', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM staff_users
        WHERE id = $1 AND academy_id = $2
        RETURNING id`,
      [String(req.params.staffId || ''), req.user!.id],
    );
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Team member not found.');
    }
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (error: any) {
    console.error('[AcademyStaff] Delete failed:', error);
    if (error?.code === '23503') {
      return sendError(
        res,
        409,
        'This account is linked to academy records. Deactivate it instead of deleting it.',
      );
    }
    sendError(res, 500, 'Unable to remove this team member');
  }
});

export const academyStaffRoles = ACADEMY_STAFF_ROLES;
export default router;
