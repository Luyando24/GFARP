import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { Router } from "express";
import { Pool } from 'pg';
import {
  LoginRequest,
  StudentLoginRequest,
  StudentAlternativeLoginRequest,
  RegisterStaffRequest,
  AuthSession,
  RegisterStaffResponse,
} from "@shared/api";
import { query, hashPassword, verifyPassword } from "../lib/db";

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create router
const router = Router();

// Helper function to create academy code
function createAcademyCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(3, "0");
}

// Helper function to generate 6-character student ID
function generateStudentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    // Find admin user by email in Admin table
    const result = await query(
      'SELECT id, email, password_hash, role, first_name, last_name, is_active FROM "Admin" WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const adminUser = result.rows[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(password, adminUser.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    if (!adminUser.is_active) {
      return res.status(401).json({ error: "Account is inactive" });
    }
    
    // Update last login time in the database if possible
    try {
      await query(
        'UPDATE "Admin" SET updated_at = NOW() WHERE id = $1',
        [adminUser.id]
      );
    } catch (updateError) {
      console.error('Could not update last login time:', updateError);
      // Continue with login process even if update fails
    }
    
    // Convert database role (ADMIN/SUPERADMIN) to frontend role (admin/superadmin)
    const frontendRole = adminUser.role.toLowerCase();
    
    const session: AuthSession = {
      userId: adminUser.id,
      role: frontendRole,
      tokens: {
        accessToken: `token_${adminUser.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleStudentLogin: RequestHandler = async (req, res) => {
  try {
    const { studentId }: StudentLoginRequest = req.body;
    
    // Find student by student ID
    const result = await query(
      'SELECT id, student_id, first_name_cipher, last_name_cipher FROM students WHERE student_id = $1',
      [studentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid student ID" });
    }
    
    const student = result.rows[0];
    
    const session: AuthSession = {
      userId: student.id,
      role: "student",
      studentId: student.id,
      tokens: {
        accessToken: `token_${student.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleStudentAlternativeLogin: RequestHandler = async (req, res) => {
  try {
    const { email, phone, password }: StudentAlternativeLoginRequest = req.body;
    
    let result;
    if (email) {
      // Find student by email
      result = await query(
        'SELECT id, password_hash FROM students WHERE email_cipher = $1 AND password_hash IS NOT NULL',
        [email] // Note: In production, this should be encrypted
      );
    } else if (phone) {
      // Find student by phone
      result = await query(
        'SELECT id, password_hash FROM students WHERE phone_auth_cipher = $1 AND password_hash IS NOT NULL',
        [phone] // Note: In production, this should be encrypted
      );
    } else {
      return res.status(400).json({ error: "Email or phone required" });
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const student = result.rows[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(password, student.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const session: AuthSession = {
      userId: student.id,
      role: "student",
      studentId: student.id,
      tokens: {
        accessToken: `token_${student.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Student alternative login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterStaff: RequestHandler = async (req, res) => {
  try {
    const {
      schoolName: academyName,
      email,
      password,
      firstName,
      lastName,
      role = "admin",
    }: RegisterStaffRequest = req.body;
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create academy
    const academyId = uuidv4();
    const academyCode = createAcademyCode(academyName);
    
    await query(
      `INSERT INTO academies (id, name, code, address, district, province, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [academyId, academyName, academyCode, "", "", "", ""]
    );
    
    // Create staff user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, academy_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, academyId, email, passwordHash, role, firstName, lastName, "", true]
    );
    
    const response: RegisterStaffResponse = {
      userId,
      schoolId: academyId, // Keep the same property name for backward compatibility
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Staff registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterSchool: RequestHandler = async (req, res) => {
  try {
    const {
      schoolName,
      schoolType,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role = "admin",
    } = req.body;
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create academy (using academies table)
    const academyId = uuidv4();
    const academyCode = createAcademyCode(schoolName);
    
    await query(
      `INSERT INTO academies (id, name, code, address, district, province, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [academyId, schoolName, academyCode, "", "", "", phoneNumber || ""]
    );
    
    // Create staff user (academy admin)
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, academy_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, academyId, email, passwordHash, role, firstName, lastName, phoneNumber || "", true]
    );
    
    const response = {
      userId,
      schoolId: academyId, // Keep the same property name for backward compatibility
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('School registration error:', error);
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
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create super admin user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    // Map client-side role to valid database enum value
    const clientRole = req.body.role || "super_admin";
    const dbRole = "superadmin"; // Always use 'superadmin' as the valid enum value
    
    await query(
      `INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, null, email, passwordHash, dbRole, firstName, lastName, req.body.phoneNumber || "", true]
    );
    
    const response = {
      userId,
      role: clientRole // Return the client-side role for consistency
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
       FROM staff_users 
       WHERE role = 'superadmin' 
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

// Define the /api/admin/create-user endpoint
router.post('/admin/create-user', async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Insert the new user into the database
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [name, email, password, role || 'staff', status || 'active']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export const handleDeleteSuperAdmin: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const userResult = await query(
      'SELECT id FROM staff_users WHERE id = $1 AND role = $2',
      [userId, 'superadmin']
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Super admin not found" });
    }
    
    // Delete the user
    await query(
      'DELETE FROM staff_users WHERE id = $1',
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
router.get('/admin/list-users', async (req, res) => {
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
router.get('/admin/list-admins', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at, updated_at
       FROM "Admin"
       WHERE role IN ('ADMIN', 'SUPERADMIN')
       ORDER BY created_at DESC`,
      []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List Admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new admin user
router.post('/admin/create-admin', async (req, res) => {
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

    // Hash password (in production, use bcrypt)
    const hashedPassword = password; // TODO: Implement proper password hashing

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
router.put('/admin/update-admin/:id', async (req, res) => {
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
      queryParams.push(password); // TODO: Hash password in production
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
router.delete('/admin/delete-admin/:id', async (req, res) => {
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
router.put('/admin/toggle-status/:id', async (req, res) => {
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