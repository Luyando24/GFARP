# Production Authentication Setup Guide

## Current Status
✅ **Development**: Mock authentication system is working  
⚠️ **Production**: Needs proper database authentication

## Overview

Your application currently uses a **mock authentication system** for development, which is perfect for testing but not suitable for production. Here's how to set up proper database authentication for production deployment.

## Current Authentication Flow

### Development (Mock System)
- **Location**: `client/lib/api.ts` - `mock.login()` function
- **Credentials**: Hardcoded in code (`admin@system.com` / `admin123`)
- **Storage**: No database, uses local memory
- **Security**: ⚠️ Not secure for production

### Production (Database System)
- **Location**: `server/routes/auth.ts` - `handleLogin()` function  
- **Credentials**: Stored in Supabase database with hashed passwords
- **Storage**: Secure database with proper encryption
- **Security**: ✅ Production-ready with bcrypt hashing

## Step-by-Step Production Setup

### 1. Database Setup

First, create the Admin table in your Supabase database:

```sql
-- Create Admin table
CREATE TABLE IF NOT EXISTS "Admin" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_email ON "Admin"(email);
CREATE INDEX IF NOT EXISTS idx_admin_role ON "Admin"(role);
CREATE INDEX IF NOT EXISTS idx_admin_active ON "Admin"(is_active);

-- Enable Row Level Security
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;

-- Create access policies
CREATE POLICY "Admins can view all admin records" ON "Admin"
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert admin records" ON "Admin"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update admin records" ON "Admin"
  FOR UPDATE USING (true);
```

### 2. Environment Configuration

Update your production environment variables:

```bash
# Disable mock authentication
VITE_USE_MOCK=false

# Set production API URL
VITE_API_BASE_URL=https://your-domain.com/api

# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database connection
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
```

### 3. Create Production Admin Users

Run the production setup script:

```bash
node scripts/setup-production-auth.js
```

This will:
- Create secure admin accounts with hashed passwords
- Generate strong random passwords
- Set up proper database records
- Provide security recommendations

### 4. Update Authentication Logic

The application will automatically switch from mock to database authentication when `VITE_USE_MOCK=false`.

**Mock Mode** (`VITE_USE_MOCK=true`):
```javascript
// Uses hardcoded credentials
if (email === "admin@system.com" && password === "admin123") {
  return { userId: "superadmin-001", role: "superadmin" };
}
```

**Production Mode** (`VITE_USE_MOCK=false`):
```javascript
// Uses database with proper password hashing
const result = await query(
  'SELECT * FROM staff_users WHERE email = $1',
  [email]
);
const isValid = await verifyPassword(password, user.password_hash);
```

## Security Features

### ✅ Production Security
- **Password Hashing**: bcrypt with salt rounds
- **Database Storage**: Encrypted credentials in Supabase
- **Row Level Security**: Database-level access control
- **Environment Variables**: Sensitive data not in code
- **HTTPS**: Secure transmission in production
- **Session Management**: Proper token-based authentication

### ⚠️ Development Security (Mock)
- **Hardcoded Credentials**: Visible in source code
- **No Encryption**: Plain text passwords
- **No Persistence**: Lost on refresh
- **Local Only**: Not suitable for multi-user

## Migration Checklist

### Before Production Deployment:

- [ ] Create Admin table in Supabase
- [ ] Run production auth setup script
- [ ] Set `VITE_USE_MOCK=false`
- [ ] Configure production environment variables
- [ ] Test login with database credentials
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure backup procedures

### Security Best Practices:

- [ ] Use strong, unique passwords
- [ ] Enable 2FA where possible
- [ ] Regular password rotation
- [ ] Monitor login attempts
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Regular security updates

## Current Admin Credentials

### Development (Mock System)
```
Email: admin@system.com
Password: admin123
Role: SUPERADMIN
```

### Production (Database System)
```
Email: admin@gfarp.com
Password: pDo7V3Baq*CtvCu%
Role: SUPERADMIN
```

⚠️ **Important**: Change the production password after first login!

## Testing the Setup

1. **Local Development**: Keep `VITE_USE_MOCK=true` for development
2. **Staging**: Set `VITE_USE_MOCK=false` to test database auth
3. **Production**: Ensure `VITE_USE_MOCK=false` and proper credentials

## Troubleshooting

### Common Issues:

1. **"Invalid credentials" error**
   - Check `VITE_USE_MOCK` setting
   - Verify database connection
   - Confirm admin records exist

2. **Database connection failed**
   - Check `DATABASE_URL` format
   - Verify Supabase project status
   - Test network connectivity

3. **Table not found**
   - Create Admin table manually
   - Check table name casing
   - Verify database permissions

## Next Steps

1. **Immediate**: Test current mock authentication
2. **Development**: Continue using mock system
3. **Pre-Production**: Set up database authentication
4. **Production**: Deploy with proper security

The mock system is perfect for development - it's fast, reliable, and doesn't require database setup. When you're ready for production, follow this guide to implement proper database authentication with all the security features your application needs.