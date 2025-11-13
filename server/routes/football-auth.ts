import express, { Request, Response } from 'express';
import { Router } from 'express';
// bcrypt usage is centralized in lib/db; avoid importing here
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction, hashPassword, verifyPassword } from '../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Academy Registration
export async function handleAcademyRegister(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      password,
      contactPerson,
      phone,
      address,
      city,
      country,
      foundedYear,
      description,
      subscriptionPlan
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !contactPerson || !phone || !address || !city || !country) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
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
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Generate UUID for academy
      const academyId = uuidv4();
      
      // Create academy code
      const academyCode = (name || 'academy')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 8);

      // Insert academy using the correct table structure
      const academyInsertQuery = `
        INSERT INTO academies (
          id, name, code, email, address, district, province, phone, website,
          academy_type, status, director_name, director_email, director_phone, 
          founded_year, password_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, name, email, code
      `;

      const academyInsertValues = [
        academyId,
        name,
        academyCode,
        email,
        address || null,
        city || null,
        country || null,
        phone || null,
        null, // website
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
      const selectedPlanId = subscriptionPlan || 'free';
      const selectedPlanName = planIdToName[selectedPlanId] || 'Free Plan';
      
      // Get subscription plan details
      const planQuery = `SELECT * FROM subscription_plans WHERE name = $1`;
      const planResult = await client.query(planQuery, [selectedPlanName]);
      
      if (planResult.rows.length === 0) {
        throw new Error(`Subscription plan '${selectedPlanName}' not found`);
      }
      
      const plan = planResult.rows[0];
      
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
        academyId,
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
    console.error('Academy registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register academy',
      error: error.message || 'Unknown error'
    });
  }
}

// Academy Login
export async function handleAcademyLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
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