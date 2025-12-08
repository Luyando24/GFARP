import express, { RequestHandler } from 'express';
import { Router } from 'express';
// bcrypt usage is centralized in lib/db; avoid importing here
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction, hashPassword, verifyPassword } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Determine academies.id column type to align FKs
async function getAcademiesIdType(client: any): Promise<'uuid' | 'integer'> {
  const res = await client.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'academies' AND column_name = 'id'
  `);
  const t = res.rows[0]?.data_type?.toLowerCase();
  if (t === 'integer' || t === 'bigint') return 'integer';
  return 'uuid';
}

// Ensure subscription schema exists with basic seed data (runtime safeguard)
async function ensureSubscriptionSchema(client: any, academyIdType: 'uuid' | 'integer' = 'uuid') {
  // Create tables if missing (no UUID default to avoid extension requirements)
  await client.query(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      currency TEXT NOT NULL DEFAULT 'USD',
      billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY', 'LIFETIME')),
      player_limit INTEGER NOT NULL DEFAULT 2,
      storage_limit BIGINT NOT NULL DEFAULT 1073741824,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_free BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const academyIdColumn = academyIdType === 'integer' ? 'INTEGER' : 'UUID';
  await client.query(`
    CREATE TABLE IF NOT EXISTS academy_subscriptions (
      id UUID PRIMARY KEY,
      academy_id ${academyIdColumn} NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED')),
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
      payment_method TEXT CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL')),
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
      amount_paid DECIMAL(10,2),
      payment_reference TEXT,
      notes TEXT,
      activated_by UUID,
      activated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS subscription_history (
      id UUID PRIMARY KEY,
      subscription_id UUID NOT NULL REFERENCES academy_subscriptions(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('CREATED', 'ACTIVATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
      old_status TEXT,
      new_status TEXT,
      old_plan_id UUID REFERENCES subscription_plans(id),
      new_plan_id UUID REFERENCES subscription_plans(id),
      performed_by UUID,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS subscription_payments (
      id UUID PRIMARY KEY,
      subscription_id UUID NOT NULL REFERENCES academy_subscriptions(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYPAL')),
      payment_reference TEXT,
      payment_date TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
      processed_by UUID,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, sort_order);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_academy ON academy_subscriptions(academy_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_academy_subscriptions_status ON academy_subscriptions(status);`);

  // Seed default plans if missing
  const { rows: planRows } = await client.query(`SELECT COUNT(*)::int AS count FROM subscription_plans`);
  if ((planRows[0]?.count ?? 0) === 0) {
    const makePlan = (name: string, desc: string, price: number, cycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME', players: number, storage: number, features: any[], isFree: boolean, order: number) => ({
      id: uuidv4(), name, description: desc, price, currency: 'USD', billing_cycle: cycle, player_limit: players, storage_limit: storage, features: JSON.stringify(features), is_active: true, is_free: isFree, sort_order: order,
    });
    const plans = [
      makePlan('Free Plan', 'Perfect for small academies getting started', 0.00, 'LIFETIME', 3, 1073741824, [
        'Up to 3 players', 'Basic player management', 'Email support', 'Basic reporting'
      ], true, 1),
      makePlan('Basic Plan', 'Great for growing academies', 29.99, 'MONTHLY', 50, 5368709120, [
        'Advanced player management', 'Document storage (5GB)', 'Email support', 'Advanced reporting', 'Player analytics'
      ], false, 2),
      makePlan('Pro Plan', 'For established academies', 59.99, 'MONTHLY', 200, 10737418240, [
        'Unlimited player management', 'Document storage (10GB)', 'Priority support', 'Advanced analytics', 'Custom reports', 'API access'
      ], false, 3),
      makePlan('Elite Plan', 'For large academies and organizations', 99.99, 'MONTHLY', 1000, 53687091200, [
        'Unlimited features', 'Document storage (50GB)', '24/7 support', 'White-label options', 'Multi-academy management', 'Advanced integrations'
      ], false, 4),
    ];
    for (const p of plans) {
      await client.query(
        `INSERT INTO subscription_plans (id, name, description, price, currency, billing_cycle, player_limit, storage_limit, features, is_active, is_free, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (name) DO NOTHING`,
        [p.id, p.name, p.description, p.price, p.currency, p.billing_cycle, p.player_limit, p.storage_limit, p.features, p.is_active, p.is_free, p.sort_order]
      );
    }
  }
}

// Ensure academies table exists with expected columns
async function ensureAcademiesSchema(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS academies (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT,
      address TEXT,
      district TEXT,
      province TEXT,
      phone TEXT,
      website TEXT,
      academy_type TEXT CHECK (academy_type IN ('youth','professional','community','elite')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
      director_name TEXT,
      director_email TEXT,
      director_phone TEXT,
      founded_year INTEGER,
      facilities TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Ensure storage_used column exists
  await client.query(`ALTER TABLE academies ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;`);
}

// Academy Registration
export const handleAcademyRegister: RequestHandler = async (req, res) => {
  try {
    // Guard: database pool must be initialized
    // Guard: database pool must be initialized
    // (Implicitly handled by query/transaction helpers which throw if DB not configured)

    // Debug instrumentation to inspect incoming request shape
    const ct = req.headers['content-type'];
    const method = req.method;
    const url = req.url;
    const bodyType = typeof (req as any).body;
    let safePreview: any = undefined;
    try {
      const b: any = (req as any).body;
      if (b && typeof b === 'object') {
        safePreview = {
          keys: Object.keys(b),
          name: b.name,
          email: b.email,
          contactPerson: b.contactPerson,
        };
      } else if (typeof b === 'string') {
        safePreview = `${b.slice(0, 120)}...`;
      }
    } catch (_) { /* ignore */ }
    console.log('[academy/register] req debug', { method, url, ct, bodyType, bodyPreview: safePreview });

    // Robust body parsing to support serverless environments and edge cases
    let name: string | undefined;
    let email: string | undefined;
    let password: string | undefined;
    let contactPerson: string | undefined;
    let phone: string | undefined;
    let address: string | undefined;
    let city: string | undefined;
    let country: string | undefined;
    let foundedYear: number | string | undefined;
    let description: string | undefined;
    let subscriptionPlan: string | undefined;

    const assignFrom = (src: any) => {
      if (!src || typeof src !== 'object') return;
      name = name ?? src.name;
      email = email ?? src.email;
      password = password ?? src.password;
      contactPerson = contactPerson ?? (src.contactPerson || src.directorName);
      phone = phone ?? src.phone;
      address = address ?? src.address;
      city = city ?? (src.city || src.district);
      country = country ?? (src.country || src.province);
      foundedYear = foundedYear ?? (src.foundedYear ?? src.establishedYear);
      description = description ?? src.description;
      subscriptionPlan = subscriptionPlan ?? (src.subscriptionPlan ?? src.selectedPlan);
    };

    // Prefer JSON-parsed body
    const incomingBody: any = (req as any).body;
    if (incomingBody) {
      if (typeof incomingBody === 'string') {
        try { assignFrom(JSON.parse(incomingBody)); } catch (_) { }
      } else if (Buffer.isBuffer(incomingBody)) {
        try { assignFrom(JSON.parse(incomingBody.toString('utf8'))); } catch (_) { }
      } else if (typeof incomingBody === 'object') {
        assignFrom(incomingBody);
      }
    }

    // Fallback: parse raw body if present
    const rawBody: any = (req as any).rawBody;
    if ((!name || !email) && rawBody) {
      try {
        if (typeof rawBody === 'string') {
          assignFrom(JSON.parse(rawBody));
        } else if (Buffer.isBuffer(rawBody)) {
          assignFrom(JSON.parse(rawBody.toString('utf8')));
        }
      } catch (_) { }
    }

    // Fallback: read request stream
    if (!name || !email || !password) {
      const chunks: Buffer[] = [];
      try {
        await new Promise<void>((resolve) => {
          const onData = (chunk: Buffer) => chunks.push(chunk);
          const onEnd = () => {
            req.off('data', onData);
            req.off('end', onEnd);
            resolve();
          };
          req.on('data', onData);
          req.on('end', onEnd);
        });
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) { try { assignFrom(JSON.parse(raw)); } catch (_) { } }
      } catch (_) { }
    }

    // Netlify/serverless: read original event body if present
    if (!name || !email || !password) {
      try {
        const event: any = (req as any).event || (req as any).apiGateway || (req as any).requestContext?.event;
        const bodyFromEvent = event?.body;
        if (bodyFromEvent) {
          const raw = event.isBase64Encoded ? Buffer.from(bodyFromEvent, 'base64').toString('utf8') : bodyFromEvent;
          assignFrom(JSON.parse(raw));
        }
      } catch (_) { }
    }

    // Allow minimal registration: email + password only
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if academy already exists
    const existingAcademyResult = await query('SELECT * FROM academies WHERE email = $1', [email]);
    if (existingAcademyResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Academy with this email already exists'
      });
    }

    // Use transaction to ensure all operations succeed or fail together
    const result = await transaction(async (client) => {
      const runtimeSchemaGuards = (process.env.DB_RUNTIME_GUARDS || 'on').toLowerCase() === 'on';

      // In development we can auto-create missing tables; in production prefer explicit migrations
      if (runtimeSchemaGuards) {
        await ensureAcademiesSchema(client);
      } else {
        const { rows: [existsRow] } = await client.query(
          `SELECT EXISTS (
             SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'academies'
           ) AS exists`
        );
        if (!existsRow?.exists) {
          throw new Error('Database schema missing: academies table is not present. Disable DB_RUNTIME_GUARDS only after running migrations.');
        }
      }

      const academyIdType = await getAcademiesIdType(client);

      if (runtimeSchemaGuards) {
        await ensureSubscriptionSchema(client, academyIdType);
      } else {
        const { rows: [existsSub] } = await client.query(
          `SELECT EXISTS (
             SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'subscription_plans'
           ) AS exists`
        );
        if (!existsSub?.exists) {
          throw new Error('Database schema missing: subscription tables are not present. Disable DB_RUNTIME_GUARDS only after running migrations.');
        }
      }
      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate academy id depending on schema type
      const isUuidId = academyIdType === 'uuid';
      const academyId = isUuidId ? uuidv4() : null;

      // Create academy code
      const academyCode = (name || 'academy')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 8);

      // Insert academy using the correct table structure
      const academyInsertQuery = isUuidId ? `
        INSERT INTO academies (
          id, name, code, email, address, district, province, phone, website,
          academy_type, status, director_name, director_email, director_phone,
          founded_year, password_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, name, email, code
      ` : `
        INSERT INTO academies (
          name, code, email, address, district, province, phone, website,
          academy_type, status, director_name, director_email, director_phone,
          founded_year, password_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, name, email, code
      `;

      const defaultName = name && name.trim() ? name : 'New Academy';
      const academyInsertValues = isUuidId ? [
        academyId,
        defaultName,
        academyCode,
        email,
        address || null,
        city || null,
        country || null,
        phone || null,
        null,
        'youth',
        'active',
        contactPerson || null,
        email || null,
        phone || null,
        foundedYear ? parseInt(foundedYear.toString()) : null,
        hashedPassword
      ] : [
        defaultName,
        academyCode,
        email,
        address || null,
        city || null,
        country || null,
        phone || null,
        null,
        'youth',
        'active',
        contactPerson || null,
        email || null,
        phone || null,
        foundedYear ? parseInt(foundedYear.toString()) : null,
        hashedPassword
      ];

      const academyResult = await client.query(academyInsertQuery, academyInsertValues);
      const academy = academyResult.rows[0];

      // Map plan IDs to plan names
      const planIdToName = {
        'free': 'Free Plan',
        'basic': 'Basic Plan',
        'pro': 'Pro Plan',
        'elite': 'Elite Plan'
      };

      // Get the subscription plan (default to 'free' if not provided)
      const selectedPlanInput = subscriptionPlan || 'free';
      let plan: any = null;

      if (planIdToName[selectedPlanInput]) {
        // Input is a known slug; look up by name
        const selectedPlanName = planIdToName[selectedPlanInput];
        const planByName = await client.query(
          `SELECT * FROM subscription_plans WHERE name = $1 AND is_active = true`,
          [selectedPlanName]
        );
        console.log('[academy/register] plan lookup by name', { selectedPlanInput, selectedPlanName, found: planByName.rows[0]?.id });
        if (planByName.rows.length === 0) {
          throw new Error(`Subscription plan '${selectedPlanName}' not found`);
        }
        plan = planByName.rows[0];
      } else {
        // Input may be a UUID; try by id first, then fallback to Free Plan
        const planById = await client.query(
          `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
          [selectedPlanInput]
        );
        console.log('[academy/register] plan lookup by id', { selectedPlanInput, found: planById.rows[0]?.id });
        if (planById.rows.length > 0) {
          plan = planById.rows[0];
        } else {
          const freePlan = await client.query(
            `SELECT * FROM subscription_plans WHERE name = $1 AND is_active = true`,
            ['Free Plan']
          );
          console.log('[academy/register] plan fallback to Free Plan', { found: freePlan.rows[0]?.id });
          if (freePlan.rows.length === 0) {
            throw new Error(`Subscription plan lookup failed and no active Free Plan is configured`);
          }
          plan = freePlan.rows[0];
        }
      }

      // Create academy subscription
      const subscriptionId = uuidv4();
      const subscriptionQuery = `
        INSERT INTO academy_subscriptions (
          id, academy_id, plan_id, status, start_date, end_date, 
          auto_renew, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, status, start_date, end_date
      `;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const subscriptionValues = [
        subscriptionId,
        academy.id,
        plan.id,
        'ACTIVE',
        startDate,
        endDate,
        true
      ];

      const subscriptionResult = await client.query(subscriptionQuery, subscriptionValues);
      const subscription = subscriptionResult.rows[0];

      // Log subscription history
      const historyId = uuidv4();
      const historyQuery = `
        INSERT INTO subscription_history (
          id, subscription_id, action, old_plan_id, new_plan_id, 
          notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;

      await client.query(historyQuery, [
        historyId,
        subscriptionId,
        'ACTIVATED',
        null,
        plan.id,
        'Initial subscription on academy registration'
      ]);

      return { academy, subscription, plan };
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: result.academy.id, email: result.academy.email, role: 'ACADEMY_ADMIN' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Academy registered successfully',
      data: {
        academy: {
          id: result.academy.id,
          name: result.academy.name,
          email: result.academy.email
        },
        subscription: {
          id: result.subscription.id,
          plan: result.plan.name,
          status: result.subscription.status,
          playerLimit: result.plan.player_limit,
          storageLimit: result.plan.storage_limit,
          startDate: result.subscription.start_date,
          endDate: result.subscription.end_date,
          autoRenew: result.subscription.auto_renew
        },
        token
      }
    });
  } catch (error: any) {
    const details = {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      schema: error?.schema,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    };
    console.error('Academy registration error:', details);
    const reason = details.message || error?.toString?.() || 'Unknown error';
    const msgSuffix = [details.code, details.constraint, details.detail].filter(Boolean).join(' | ');
    return res.status(500).json({
      success: false,
      message: `Failed to register academy: ${reason}${msgSuffix ? ' - ' + msgSuffix : ''}`,
      error: reason,
      details
    });
  }
}

// Academy Login
export const handleAcademyLogin: RequestHandler = async (req, res) => {
  try {
    // Guard: database pool must be initialized (avoids implicit localhost connection)
    // Guard: database pool must be initialized (avoids implicit localhost connection)
    // (Implicitly handled by query helper)

    // Debug instrumentation to inspect incoming request shape
    const ct = req.headers['content-type'];
    const method = req.method;
    const url = req.url;
    const bodyType = typeof (req as any).body;
    let safePreview: any = undefined;
    try {
      const b: any = (req as any).body;
      if (b && typeof b === 'object') {
        safePreview = {
          keys: Object.keys(b),
          email: b.email,
          password: b.password ? '<redacted>' : undefined,
        };
      } else if (typeof b === 'string') {
        safePreview = `${b.slice(0, 100)}...`;
      }
    } catch (_) {
      // ignore
    }
    console.log('[academy/login] req debug', { method, url, ct, bodyType, bodyPreview: safePreview });

    // Robust body parsing to support serverless environments and edge cases
    let email: string | undefined;
    let password: string | undefined;

    // Prefer JSON-parsed body
    const incomingBody: any = (req as any).body;
    if (incomingBody) {
      if (typeof incomingBody === 'string') {
        try {
          const parsed = JSON.parse(incomingBody);
          email = parsed?.email;
          password = parsed?.password;
        } catch (_) {
          // ignore JSON parse error
        }
      } else if (Buffer.isBuffer(incomingBody)) {
        try {
          const parsed = JSON.parse(incomingBody.toString('utf8'));
          email = parsed?.email;
          password = parsed?.password;
        } catch (_) {
          // ignore
        }
      } else if (typeof incomingBody === 'object') {
        email = incomingBody?.email;
        password = incomingBody?.password;
      }
    }

    // Fallback: attempt to parse raw body if present
    const rawBody: any = (req as any).rawBody;
    if ((!email || !password) && rawBody) {
      try {
        if (typeof rawBody === 'string') {
          const parsed = JSON.parse(rawBody);
          email = email || parsed?.email;
          password = password || parsed?.password;
        } else if (Buffer.isBuffer(rawBody)) {
          const parsed = JSON.parse(rawBody.toString('utf8'));
          email = email || parsed?.email;
          password = password || parsed?.password;
        }
      } catch (_) {
        // ignore
      }
    }

    // Fallback: try to read request stream directly if body parsers failed
    if (!email || !password) {
      const chunks: Buffer[] = [];
      try {
        await new Promise<void>((resolve) => {
          const onData = (chunk: Buffer) => chunks.push(chunk);
          const onEnd = () => {
            req.off('data', onData);
            req.off('end', onEnd);
            resolve();
          };
          req.on('data', onData);
          req.on('end', onEnd);
        });
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            email = email || parsed?.email;
            password = password || parsed?.password;
          } catch (_) {
            // ignore
          }
        }
      } catch (_) {
        // ignore
      }
    }

    // Fallback: accept query parameters in emergency cases
    if (!email || !password) {
      const q: any = (req as any).query || {};
      if (typeof q.email === 'string') email = email || q.email;
      if (typeof q.password === 'string') password = password || q.password;
    }

    // Netlify/serverless specific: try to read the original event body
    if (!email || !password) {
      try {
        const event: any = (req as any).event || (req as any).apiGateway || (req as any).requestContext?.event;
        const bodyFromEvent = event?.body;
        if (bodyFromEvent) {
          const raw = event.isBase64Encoded ? Buffer.from(bodyFromEvent, 'base64').toString('utf8') : bodyFromEvent;
          const parsed = JSON.parse(raw);
          email = email || parsed?.email;
          password = password || parsed?.password;
        }
      } catch (_) {
        // ignore
      }
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find academy by email and verify password
    const academyResult = await query(`
      SELECT id, name, email, address, district, province, phone, director_name, password_hash
      FROM academies
      WHERE email = $1 AND status = 'active'
      LIMIT 1
    `, [email]);

    if (academyResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const academy = academyResult.rows[0];

    // Check if password_hash exists, if not, this academy needs to set up authentication
    if (!academy.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Academy authentication not set up. Please contact support.'
      });
    }

    const isValid = await verifyPassword(password, academy.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: academy.id, email: academy.email, role: 'ACADEMY_ADMIN' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        academy: {
          id: academy.id,
          name: academy.name,
          email: academy.email,
          contactPerson: academy.director_name,
          phone: academy.phone,
          address: academy.address,
          city: academy.district,
          country: academy.province
        },
        token
      }
    });
  } catch (error: any) {
    console.error('Academy login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message || 'Unknown error' });
  }
}

// Define the router and routes
const footballAuthRouter = Router();
footballAuthRouter.post('/academy/register', handleAcademyRegister);
footballAuthRouter.post('/academy/login', handleAcademyLogin);

// Export the router as the default export
export default footballAuthRouter;
