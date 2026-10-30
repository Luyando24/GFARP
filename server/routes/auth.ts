import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  LoginRequest,
  AuthSession,
} from "../../shared/api.js";
import { query, hashPassword, verifyPassword } from "../lib/db.js";
import { emailService } from "../lib/email-service.js";
import { getJwtSecret } from "../lib/jwt.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  consumePasswordResetToken,
  issuePasswordResetToken,
  revokeAccountSessions,
  signSessionToken,
} from "../lib/auth-tokens.js";
import { authenticateToken, requireAdmin, requireSuperAdmin } from "../middleware/auth.js";
import { isConfigurationError } from "../lib/config.js";

// Create router
const router = Router();

type ResetAccountType = "academy" | "agency" | "admin" | "individual_player";

const PASSWORD_RESET_RESPONSE = {
  success: true,
  message: "If an account exists with this email, a password reset link has been sent."
};

router.post('/auth/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    let account: { accountType: ResetAccountType; userId: string } | null = null;

    const academy = await query('SELECT id FROM academies WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [email]);
    if (academy.rows.length) {
      account = { accountType: 'academy', userId: academy.rows[0].id };
    } else {
      const agency = await query('SELECT id FROM agencies WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [email]);
      if (agency.rows.length) {
        account = { accountType: 'agency', userId: agency.rows[0].id };
      } else {
        const player = await query('SELECT id FROM individual_players WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [email]);
        if (player.rows.length) {
          account = { accountType: 'individual_player', userId: player.rows[0].id };
        } else {
          const admin = await query('SELECT id FROM "Admin" WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [email]);
          if (admin.rows.length) account = { accountType: 'admin', userId: admin.rows[0].id };
        }
      }
    }

    // Always return the same response so this endpoint cannot be used to enumerate accounts.
    if (!account) return res.json(PASSWORD_RESET_RESPONSE);

    const token = await issuePasswordResetToken(account.accountType, account.userId);
    const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'https://www.soccercircular.com').replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const result = await emailService.sendEmail({
      to: email,
      subject: 'Reset your Soccer Circular password',
      html: `<p>We received a request to reset your Soccer Circular password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`
    });

    if (!result.success) {
      console.error('[AUTH] Password reset email could not be sent:', result.error);
      return res.status(503).json({ success: false, message: 'Password reset email is temporarily unavailable. Please try again later.' });
    }

    return res.json(PASSWORD_RESET_RESPONSE);
  } catch (error) {
    console.error('[AUTH] Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process the password reset request.' });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  try {
    if (!token) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
    }

    // Tokens are single-use: consuming marks used_at before the password changes.
    const reset = await consumePasswordResetToken(token);
    if (!reset) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
    }

    const passwordHash = await hashPassword(password);
    let result;
    if (reset.accountType === 'academy') {
      result = await query(
        'UPDATE academies SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [passwordHash, reset.userId],
      );
      // Legacy academies keep the administrator password on staff_users; scope
      // the update to this academy so a shared email cannot hit other accounts.
      if (result.rows.length) {
        await query(
          'UPDATE staff_users SET password_hash = $1, updated_at = NOW() WHERE academy_id = $2',
          [passwordHash, reset.userId],
        );
      }
    } else if (reset.accountType === 'agency') {
      result = await query(
        'UPDATE agencies SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [passwordHash, reset.userId],
      );
    } else if (reset.accountType === 'individual_player') {
      result = await query(
        'UPDATE individual_players SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [passwordHash, reset.userId],
      );
    } else {
      result = await query(
        'UPDATE "Admin" SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [passwordHash, reset.userId],
      );
    }

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
    }

    // Force every previously issued token for this account to stop working.
    await revokeAccountSessions(reset.accountType, reset.userId);

    return res.json({ success: true, message: 'Your password has been reset successfully.' });
  } catch (error) {
    console.error('[AUTH] Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reset the password.' });
  }
});

export const handleLogin: RequestHandler = async (req, res) => {
  const start = Date.now();
  console.log('[AUTH] Login request started');
  try {
    const { email, password }: LoginRequest = req.body;

    // Find admin user by email in Admin table
    console.log('[AUTH] Querying user...');
    const queryStart = Date.now();
    const result = await query(
      'SELECT id, email, password_hash, role, first_name, last_name, is_active, token_version FROM "Admin" WHERE LOWER(TRIM(email)) = LOWER($1)',
      [email]
    );
    console.log(`[AUTH] User query took ${Date.now() - queryStart}ms`);

    if (result.rows.length === 0) {
      console.log('[AUTH] User not found');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const adminUser = result.rows[0];

    // Verify password
    console.log('[AUTH] Verifying password...');
    const verifyStart = Date.now();
    const isValidPassword = await verifyPassword(password, adminUser.password_hash);
    console.log(`[AUTH] Password verification took ${Date.now() - verifyStart}ms`);

    if (!isValidPassword) {
      console.log('[AUTH] Invalid password');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!adminUser.is_active) {
      return res.status(401).json({ error: "Account is inactive" });
    }

    // Update last login time in the database if possible
    try {
      // Don't await this to speed up response? 
      // In serverless we must await, but let's log it.
      const updateStart = Date.now();
      await query(
        'UPDATE "Admin" SET updated_at = NOW() WHERE id = $1',
        [adminUser.id]
      );
      console.log(`[AUTH] Last login update took ${Date.now() - updateStart}ms`);
    } catch (updateError) {
      console.error('Could not update last login time:', updateError);
      // Continue with login process even if update fails
    }

    // Convert database role (ADMIN/SUPERADMIN) to frontend role (admin/superadmin)
    const frontendRole = adminUser.role.toLowerCase();

    const token = signSessionToken({
      id: adminUser.id,
      email: adminUser.email,
      name: `${adminUser.first_name} ${adminUser.last_name}`,
      role: frontendRole,
      tokenVersion: adminUser.token_version,
    });

    const session: AuthSession = {
      userId: adminUser.id,
      role: frontendRole,
      tokens: {
        accessToken: token,
        expiresInSec: ACCESS_TOKEN_TTL_SECONDS,
      },
    };

    console.log(`[AUTH] Login completed in ${Date.now() - start}ms`);
    res.json(session);
  } catch (error) {
    console.error('Login error:', error);
    if (isConfigurationError(error)) {
      return res.status(503).json({
        success: false,
        code: "CONFIGURATION_ERROR",
        message: "The service is not fully configured. Please contact support.",
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterSuperAdmin: RequestHandler = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
    } = req.body;

    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM "Admin" WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create super admin user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO "Admin" (id, email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, email, passwordHash, 'SUPERADMIN', firstName, lastName, req.body.phoneNumber || "", true]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: userId, 
        email, 
        role: 'superadmin'
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const response = {
      userId,
      role: 'super_admin',
      token
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Super Admin registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleListSuperAdmins: RequestHandler = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, is_active, created_at, updated_at
       FROM "Admin"
       WHERE role = 'SUPERADMIN'
       ORDER BY created_at DESC`,
      []
    );

    const superAdmins = result.rows.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone || '',
      role: 'super_admin',
      permissions: [], // TODO: Implement permissions system
      createdAt: user.created_at,
      lastLogin: user.updated_at,
      status: user.is_active ? 'active' : 'inactive'
    }));

    res.json(superAdmins);
  } catch (error) {
    console.error('List Super Admins error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleDeleteSuperAdmin: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userResult = await query(
      'SELECT id FROM "Admin" WHERE id = $1 AND role = $2',
      [userId, 'SUPERADMIN']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Super admin not found" });
    }

    // Delete the user
    await query(
      'DELETE FROM "Admin" WHERE id = $1',
      [userId]
    );

    res.json({ message: "Super admin deleted successfully" });
  } catch (error) {
    console.error('Delete Super Admin error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Note: Data is now stored in PostgreSQL database
// No need to export in-memory stores

export const handleListStaffUsers: RequestHandler = async (req, res) => {
  try {
    // TODO: once authentication middleware is implemented, filter by academy for academy_admin

    const result = await query(
      `SELECT id, academy_id, email, first_name, last_name, role, is_active, created_at, updated_at
       FROM staff_users
       ORDER BY created_at DESC`,
      []
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      role: row.role,
      academyId: row.academy_id,
      registrationDate: row.created_at,
      lastLogin: row.updated_at,
      status: row.is_active ? 'active' : 'inactive',
    }));

    res.json(users);
  } catch (error) {
    console.error('List Staff Users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Define the /api/admin/list-users endpoint
// Use the same data source and shape as handleListStaffUsers
router.get('/admin/list-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, academy_id, email, first_name, last_name, role, is_active, created_at, updated_at
       FROM staff_users
       ORDER BY created_at DESC`,
      []
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      // Name and derived fields for flexible UI usage
      name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      role: row.role,
      academyId: row.academy_id,
      registrationDate: row.created_at,
      lastLogin: row.updated_at,
      status: row.is_active ? 'active' : 'inactive',
      // Raw fields to satisfy UIs expecting these keys
      first_name: row.first_name,
      last_name: row.last_name,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin Management Endpoints

// List admin users only (admin and superadmin roles)
router.get('/admin/list-admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at, updated_at
       FROM "Admin"
       WHERE role IN ('ADMIN', 'SUPERADMIN')
       ORDER BY created_at DESC`,
      []
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('List Admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use('/admin', authenticateToken, requireAdmin);

// Create new admin user
router.post('/admin/create-admin', requireSuperAdmin, async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role (accept lowercase from frontend, convert to uppercase for database)
    const normalizedRole = role?.toUpperCase();
    if (!['ADMIN', 'SUPERADMIN'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or superadmin' });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM "Admin" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    // Insert new admin user
    const result = await query(
      `INSERT INTO "Admin" (first_name, last_name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, first_name, last_name, email, role, is_active, created_at, updated_at`,
      [first_name, last_name, email, hashedPassword, normalizedRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create Admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin user
router.put('/admin/update-admin/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, password, role } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Validate role (accept lowercase from frontend, convert to uppercase for database)
    const normalizedRole = role?.toUpperCase();
    if (!['ADMIN', 'SUPERADMIN'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or superadmin' });
    }

    // Check if admin exists
    const existingAdmin = await query(
      'SELECT id FROM "Admin" WHERE id = $1 AND role IN ($2, $3)',
      [id, 'ADMIN', 'SUPERADMIN']
    );

    if (existingAdmin.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Check if email already exists for another user
    const emailCheck = await query(
      'SELECT id FROM "Admin" WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists for another user' });
    }

    // Build update query
    let updateQuery = `UPDATE "Admin" SET first_name = $1, last_name = $2, email = $3, role = $4, updated_at = NOW()`;
    let queryParams = [first_name, last_name, email, normalizedRole];

    // Add password update if provided
    if (password) {
      updateQuery += `, password_hash = $5`;
      queryParams.push(await hashPassword(password));
    }

    updateQuery += ` WHERE id = $${queryParams.length + 1} RETURNING id, first_name, last_name, email, role, is_active, created_at, updated_at`;
    queryParams.push(id);

    const result = await query(updateQuery, queryParams);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete admin user
router.delete('/admin/delete-admin/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const existingAdmin = await query(
      'SELECT id FROM "Admin" WHERE id = $1 AND role IN ($2, $3)',
      [id, 'ADMIN', 'SUPERADMIN']
    );

    if (existingAdmin.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Delete the admin user
    await query('DELETE FROM "Admin" WHERE id = $1', [id]);

    res.json({ message: 'Admin user deleted successfully' });
  } catch (error) {
    console.error('Delete Admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle admin user status
router.put('/admin/toggle-status/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Check if admin exists
    const existingAdmin = await query(
      'SELECT id FROM "Admin" WHERE id = $1 AND role IN ($2, $3)',
      [id, 'ADMIN', 'SUPERADMIN']
    );

    if (existingAdmin.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Update status
    const result = await query(
      `UPDATE "Admin" SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, first_name, last_name, email, role, is_active, created_at, updated_at`,
      [is_active, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle Admin Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
