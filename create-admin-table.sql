-- Create Admin table for production authentication
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

-- Insert super admin user
INSERT INTO "Admin" (email, password_hash, role, first_name, last_name)
VALUES (
  'admin@gfarp.com',
  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', -- SHA-256 hash of 'admin123'
  'SUPERADMIN',
  'Super',
  'Admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert regular admin user
INSERT INTO "Admin" (email, password_hash, role, first_name, last_name)
VALUES (
  'admin@system.com',
  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', -- SHA-256 hash of 'admin123'
  'ADMIN',
  'System',
  'Admin'
) ON CONFLICT (email) DO NOTHING;