import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, hashPassword } from '../../server/lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[SETUP] Admin setup request received');

    try {
        // 1. Create Admin table
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "Admin" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPERADMIN')),
        first_name TEXT,
        last_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

        await query(createTableQuery);
        console.log('✅ Admin table created/verified');

        // 2. Insert super admin user
        const insertSuperAdminQuery = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = now()
      RETURNING id, email, role;
    `;

        const superAdminPasswordHash = await hashPassword('admin123');
        const superAdminResult = await query(insertSuperAdminQuery, [
            'admin@gfarp.com',
            superAdminPasswordHash,
            'SUPERADMIN',
            'Super',
            'Admin'
        ]);

        // 3. Insert regular admin user
        const insertAdminQuery = `
      INSERT INTO "Admin" (email, password_hash, role, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = now()
      RETURNING id, email, role;
    `;

        const adminPasswordHash = await hashPassword('admin123');
        const adminResult = await query(insertAdminQuery, [
            'admin@system.com',
            adminPasswordHash,
            'ADMIN',
            'System',
            'Admin'
        ]);

        // 4. Verify count
        const verifyResult = await query('SELECT COUNT(*) as count FROM "Admin"');

        return res.status(200).json({
            success: true,
            message: 'Admin setup completed successfully',
            data: {
                superAdmin: superAdminResult.rows[0],
                admin: adminResult.rows[0],
                totalAdmins: verifyResult.rows[0].count
            },
            credentials: {
                superAdmin: { email: 'admin@gfarp.com', password: 'admin123' },
                systemAdmin: { email: 'admin@system.com', password: 'admin123' }
            }
        });

    } catch (error: any) {
        console.error('[SETUP] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Admin setup failed',
            error: error.message,
            stack: error.stack
        });
    }
}
