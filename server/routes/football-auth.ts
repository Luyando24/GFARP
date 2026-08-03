import express, { RequestHandler } from 'express';
import { Router } from 'express';
// bcrypt usage is centralized in lib/db; avoid importing here
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/jwt.js';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction, hashPassword, verifyPassword } from '../lib/db.js';
import { addBillingCycleToDate } from '../../shared/calendar-date.js';

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
    let referralCode: string | undefined;

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
      referralCode = referralCode ?? src.referralCode;
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

    // Allow minimal registration: email + password only
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if academy already exists
    const existingAcademyResult = await query('SELECT * FROM academies WHERE email = $1', [normalizedEmail]);
    if (existingAcademyResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Academy with this email already exists'
      });
    }

    // Lookup sales agent if referral code provided
    let salesAgentId = null;
    let commissionRate = 10; // Default commission rate

    if (referralCode) {
      try {
          const cleanCode = referralCode.trim();
          console.log('[academy/register] Looking up referral code:', cleanCode);
          // Use TRANSLATE to handle potential 0 (zero) vs O (letter) confusion
          // We normalize both to 'o' for comparison
          const agentRes = await query(
            `SELECT id, commission_rate FROM sales_agents 
             WHERE TRANSLATE(LOWER(code), '0', 'o') = TRANSLATE(LOWER($1), '0', 'o')`, 
            [cleanCode]
          );
          if (agentRes.rows.length > 0) {
            salesAgentId = agentRes.rows[0].id;
          if (agentRes.rows[0].commission_rate) {
            commissionRate = parseFloat(agentRes.rows[0].commission_rate);
          }
          console.log('[academy/register] Found sales agent:', { id: salesAgentId, rate: commissionRate });
        } else {
          console.log('[academy/register] No sales agent found for code:', referralCode);
        }
      } catch (err) {
        console.warn('Failed to lookup sales agent:', err);
      }
    }

    // Use transaction to ensure all operations succeed or fail together
    const result = await transaction(async (client) => {
      const academyIdType = await getAcademiesIdType(client);
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
          founded_year, password_hash, sales_agent_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, name, email, code
      ` : `
        INSERT INTO academies (
          name, code, email, address, district, province, phone, website,
          academy_type, status, director_name, director_email, director_phone,
          founded_year, password_hash, sales_agent_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, name, email, code
      `;

      const defaultName = name && name.trim() ? name : 'New Academy';
      const academyInsertValues = isUuidId ? [
        academyId,
        defaultName,
        academyCode,
        normalizedEmail,
        address || null,
        city || null,
        country || null,
        phone || null,
        null,
        'youth',
        'active',
        contactPerson || null,
        normalizedEmail,
        phone || null,
        foundedYear ? parseInt(foundedYear.toString()) : null,
        hashedPassword,
        salesAgentId
      ] : [
        defaultName,
        academyCode,
        normalizedEmail,
        address || null,
        city || null,
        country || null,
        phone || null,
        null,
        'youth',
        'active',
        contactPerson || null,
        normalizedEmail,
        phone || null,
        foundedYear ? parseInt(foundedYear.toString()) : null,
        hashedPassword,
        salesAgentId
      ];

      const academyResult = await client.query(academyInsertQuery, academyInsertValues);
      const academy = academyResult.rows[0];

      // Map plan IDs to plan names
      const planIdToName = {
        'pro': 'Pro Plan'
      };

      // Get the subscription plan (optional)
      const selectedPlanInput = subscriptionPlan;
      let plan: any = null;

      if (selectedPlanInput) {
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
          // Input may be a UUID; try by id
          const planById = await client.query(
            `SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true`,
            [selectedPlanInput]
          );
          console.log('[academy/register] plan lookup by id', { selectedPlanInput, found: planById.rows[0]?.id });
          if (planById.rows.length > 0) {
            plan = planById.rows[0];
          }
          // Do not silently grant a different plan when the requested plan is invalid.
          if (!plan) {
            throw new Error('Selected subscription plan was not found');
          }
        }
      } else {
        // No plan provided: start on the free plan, never a paid plan without payment.
        const defaultPlanByName = await client.query(
          `SELECT * FROM subscription_plans WHERE name = $1 AND is_active = true`,
          ['Free Plan']
        );
        if (defaultPlanByName.rows.length > 0) {
          plan = defaultPlanByName.rows[0];
        }
      }

      let subscription: any = null;

      if (plan) {
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
        const endDate = addBillingCycleToDate(startDate, plan.billing_cycle);
        const isFreePlan = Number(plan.price || 0) === 0;

        const subscriptionValues = [
          subscriptionId,
          academy.id,
          plan.id,
          isFreePlan ? 'ACTIVE' : 'PENDING',
          startDate,
          endDate,
          isFreePlan && String(plan.billing_cycle).toUpperCase() !== 'LIFETIME'
        ];

        const subscriptionResult = await client.query(subscriptionQuery, subscriptionValues);
        subscription = subscriptionResult.rows[0];

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
          isFreePlan ? 'ACTIVATED' : 'CREATED',
          null,
          plan.id,
          isFreePlan
            ? 'Free subscription activated on academy registration'
            : 'Paid subscription awaiting payment'
        ]);
      }

      // Record commission if sales agent linked
      if (salesAgentId) {
        try {
          let amount = 0;
          let notes = 'Academy sign-up';
          
          if (plan && plan.price) {
             const price = parseFloat(plan.price) || 0;
             amount = (price * commissionRate) / 100;
             notes = `Commission for ${plan.name} (${plan.price})`;
          }
  
          const commissionId = uuidv4();
          await client.query(`
            INSERT INTO commissions (
              id, sales_agent_id, academy_id, amount, status, notes
            ) VALUES ($1, $2, $3, $4, 'pending', $5)
          `, [commissionId, salesAgentId, academy.id, amount, notes]);
        } catch (commErr) {
          console.error('Failed to record commission:', commErr);
          // Don't fail the registration if commission fails
        }
      }

      return { academy, subscription, plan };
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: result.academy.id, email: result.academy.email, role: 'ACADEMY_ADMIN' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Academy registered successfully',
      data: {
        academy: {
          id: result.academy.id,
          name: result.academy.name,
          email: result.academy.email,
          code: result.academy.code
        },
        subscription: result.subscription ? {
          id: result.subscription.id,
          plan: result.plan.name,
          status: result.subscription.status,
          playerLimit: result.plan.player_limit,
          storageLimit: result.plan.storage_limit,
          startDate: result.subscription.start_date,
          endDate: result.subscription.end_date,
          autoRenew: result.subscription.auto_renew
        } : null,
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find academy by email (allow any status for now to give better error)
    const academyResult = await query(`
      SELECT id, name, code, email, address, district, province, phone, director_name, password_hash, status
      FROM academies
      WHERE email = $1
      LIMIT 1
    `, [normalizedEmail]);

    if (academyResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    let academy = academyResult.rows[0];

    if (academy.status !== 'active') {
      return res.status(401).json({ success: false, message: `Account is ${academy.status}. Please contact support.` });
    }

    let passwordHash = academy.password_hash;

    // Legacy academies may keep their administrator password on staff_users.
    if (!passwordHash) {
      console.log(`[AUTH] Academy ${academy.id} has no password_hash, checking staff_users...`);
      const staffResult = await query(`
        SELECT password_hash FROM staff_users
        WHERE academy_id = $1
          AND role = 'academy_admin'
          AND is_active = TRUE
          AND password_hash IS NOT NULL
        LIMIT 1
      `, [academy.id]);

      if (staffResult.rows.length > 0) {
        passwordHash = staffResult.rows[0].password_hash;
        console.log(`[AUTH] Found password_hash in staff_users for academy ${academy.id}`);
      }
    }

    if (!passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Academy authentication not set up. Please contact support.'
      });
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: academy.id, email: academy.email, role: 'ACADEMY_ADMIN' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        academy: {
          id: academy.id,
          name: academy.name,
          code: academy.code,
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

// Email Verification
export const handleVerifyEmail: RequestHandler = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    // Verify the token
    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    // In a real app, you might have a dedicated verification token or check a 'is_verified' flag
    // For now, we'll assume the token contains the academy ID and we just need to confirm it exists
    // and potentially mark it as verified if you had such a column.
    
    // We'll return the user data so the frontend can auto-login
    const academyResult = await query(`
      SELECT *
      FROM academies 
      WHERE id = $1
    `, [decoded.id]);

    if (academyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Academy not found' });
    }

    const academy = academyResult.rows[0];
    
    // Remove sensitive data
    delete academy.password_hash;
    
    // Generate a new long-lived token for login
    const loginToken = jwt.sign(
      { id: academy.id, email: academy.email, role: 'ACADEMY_ADMIN' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: academy.id,
          academy_id: academy.id, // Ensure compatibility with frontend expecting academy_id
          name: academy.name,
          email: academy.email
        },
        academy: academy, // Return full academy object for local storage
        token: loginToken
      }
    });

  } catch (error: any) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

// Agency Registration
export const handleAgencyRegister: RequestHandler = async (req, res) => {
  try {
    let { name, email, password, phone, address, city, country, subscriptionPlan, referralCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const existingAgencyResult = await query('SELECT id FROM agencies WHERE email = $1', [normalizedEmail]);
    if (existingAgencyResult.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Agency with this email already exists' });
    }

    const result = await transaction(async (client) => {
      const hashedPassword = await hashPassword(password);
      const agencyId = uuidv4();
      const agencyCode = (name || 'agency')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 8);

      const agencyInsertQuery = `
        INSERT INTO agencies (
          id, name, code, email, password_hash, address, city, country, phone, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
        RETURNING id, name, email, code
      `;

      const agencyResult = await client.query(agencyInsertQuery, [
        agencyId,
        name || 'New Agency',
        agencyCode,
        normalizedEmail,
        hashedPassword,
        address || null,
        city || null,
        country || null,
        phone || null
      ]);
      
      const agency = agencyResult.rows[0];

      // Handle subscription
      let plan: any = null;
      if (subscriptionPlan) {
        const planRes = await client.query('SELECT * FROM subscription_plans WHERE (id::text = $1 OR name = $1) AND target_type = \'AGENCY\' AND is_active = true', [subscriptionPlan]);
        if (planRes.rows.length > 0) plan = planRes.rows[0];
      }
      
      if (!plan) {
        const defaultPlanRes = await client.query('SELECT * FROM subscription_plans WHERE target_type = \'AGENCY\' AND is_active = true ORDER BY sort_order LIMIT 1');
        if (defaultPlanRes.rows.length > 0) plan = defaultPlanRes.rows[0];
      }

      let subscription: any = null;
      if (plan) {
        const subId = uuidv4();
        const startDate = new Date();
        const endDate = addBillingCycleToDate(startDate, plan.billing_cycle);
        const isFreePlan = Number(plan.price || 0) === 0;

        const subRes = await client.query(`
          INSERT INTO agency_subscriptions (id, agency_id, plan_id, status, start_date, end_date, auto_renew)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, status, start_date, end_date
        `, [
          subId,
          agency.id,
          plan.id,
          isFreePlan ? 'ACTIVE' : 'PENDING',
          startDate,
          endDate,
          isFreePlan && String(plan.billing_cycle).toUpperCase() !== 'LIFETIME',
        ]);
        subscription = subRes.rows[0];
      }

      return { agency, subscription, plan };
    });

    const token = jwt.sign(
      { id: result.agency.id, email: result.agency.email, role: 'AGENCY_ADMIN' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Agency registered successfully',
      data: {
        agency: result.agency,
        subscription: result.subscription ? {
          ...result.subscription,
          plan: result.plan.name
        } : null,
        token
      }
    });
  } catch (error: any) {
    console.error('Agency registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register agency', error: error.message });
  }
};

// Agency Login
export const handleAgencyLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const result = await query('SELECT * FROM agencies WHERE email = $1', [normalizedEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const agency = result.rows[0];

    if (agency.status !== 'active') {
      return res.status(401).json({ success: false, message: `Account is ${agency.status}. Please contact support.` });
    }

    const isValid = await verifyPassword(password, agency.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: agency.id, email: agency.email, role: 'AGENCY_ADMIN' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        agency: {
          id: agency.id,
          name: agency.name,
          email: agency.email
        },
        token
      }
    });
  } catch (error: any) {
    console.error('Agency login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// Define the router and routes
const footballAuthRouter = Router();
footballAuthRouter.post('/academy/register', handleAcademyRegister);
footballAuthRouter.post('/academy/login', handleAcademyLogin);
footballAuthRouter.post('/agency/register', handleAgencyRegister);
footballAuthRouter.post('/agency/login', handleAgencyLogin);
footballAuthRouter.post('/verify-email', handleVerifyEmail);

// Export the router as the default export
export default footballAuthRouter;
