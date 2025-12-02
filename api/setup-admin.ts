
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[SETUP] Admin setup request received');

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[SETUP] Missing Supabase credentials');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: Missing Supabase credentials'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[SETUP] Connected to database');

    // Helper to hash password
    const hashPassword = async (pwd: string) => bcrypt.hash(pwd, 10);
    const defaultPasswordHash = await hashPassword('admin123');

    // 1. Insert super admin user
    const { data: superAdmin, error: superAdminError } = await supabase
        .from('Admin')
        .upsert({
            email: 'admin@gfarp.com',
            password_hash: defaultPasswordHash,
            role: 'SUPERADMIN',
            first_name: 'Super',
            last_name: 'Admin',
            is_active: true
        }, { onConflict: 'email' })
        .select()
        .single();

    if (superAdminError) {
        throw superAdminError;
    }

    // 2. Insert regular admin user
    const { data: admin, error: adminError } = await supabase
        .from('Admin')
        .upsert({
            email: 'admin@system.com',
            password_hash: defaultPasswordHash,
            role: 'ADMIN',
            first_name: 'System',
            last_name: 'Admin',
            is_active: true
        }, { onConflict: 'email' })
        .select()
        .single();

    if (adminError) {
        throw adminError;
    }

    // 3. Verify count
    const { count, error: countError } = await supabase
        .from('Admin')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        throw countError;
    }

    return res.status(200).json({
      success: true,
      message: 'Admin setup completed successfully',
      data: {
        superAdmin,
        admin,
        totalAdmins: count
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
