import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock data for development - replace with actual Prisma calls when database is connected
const mockAcademies = [
  {
    id: 'academy-1',
    name: 'Elite Football Academy',
    email: 'admin@elitefootball.com',
    password: '$2b$10$hashedpassword', // This would be a real hashed password
    isActive: true,
    isVerified: true
  }
];

const mockAdmins = [
  {
    id: 'admin-1',
    email: 'superadmin@platform.com',
    password: '$2b$10$hashedpassword', // This would be a real hashed password
    role: 'SUPER_ADMIN'
  }
];
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
      licenseNumber,
      foundedYear,
      website,
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
    const existingAcademy = await prisma.academy.findUnique({
      where: { email }
    });

    if (existingAcademy) {
      return res.status(409).json({
        success: false,
        message: 'Academy with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get subscription plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { name: subscriptionPlan || 'Basic' }
    });

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Create academy
    const academy = await prisma.academy.create({
      data: {
        name,
        email,
        password: hashedPassword,
        contactPerson,
        phone,
        address,
        city,
        country,
        licenseNumber,
        foundedYear: foundedYear ? parseInt(foundedYear) : null,
        website,
        description,
        isActive: true,
        isVerified: false
      }
    });

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        academyId: academy.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        autoRenew: true
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        academyId: academy.id,
        action: 'academy_registered',
        description: `Academy ${name} registered successfully`,
        metadata: { plan: subscriptionPlan || 'Basic' },
        ipAddress: req.ip
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: academy.id, 
        email: academy.email, 
        type: 'academy' 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Academy registered successfully',
      data: {
        academy: {
          id: academy.id,
          name: academy.name,
          email: academy.email,
          contactPerson: academy.contactPerson,
          isVerified: academy.isVerified
        },
        subscription: {
          plan: plan.name,
          status: subscription.status,
          endDate: subscription.endDate
        },
        token
      }
    });

  } catch (error) {
    console.error('Academy registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Academy Login
export async function handleAcademyLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find academy
    const academy = await prisma.academy.findUnique({
      where: { email },
      include: {
        subscriptions: {
          include: {
            plan: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!academy) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if academy is active
    if (!academy.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Academy account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, academy.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: academy.id, 
        email: academy.email, 
        type: 'academy' 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log activity
    await prisma.activity.create({
      data: {
        academyId: academy.id,
        action: 'academy_login',
        description: `Academy ${academy.name} logged in`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    const currentSubscription = academy.subscriptions[0];

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        academy: {
          id: academy.id,
          name: academy.name,
          email: academy.email,
          contactPerson: academy.contactPerson,
          isVerified: academy.isVerified,
          storageUsed: academy.storageUsed
        },
        subscription: currentSubscription ? {
          plan: currentSubscription.plan.name,
          status: currentSubscription.status,
          playerLimit: currentSubscription.plan.playerLimit,
          storageLimit: currentSubscription.plan.storageLimit,
          endDate: currentSubscription.endDate
        } : null,
        token
      }
    });

  } catch (error) {
    console.error('Academy login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Admin Login
export async function handleAdminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        type: 'admin',
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log activity
    await prisma.activity.create({
      data: {
        adminId: admin.id,
        action: 'admin_login',
        description: `Admin ${admin.firstName} ${admin.lastName} logged in`,
        metadata: { role: admin.role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get Subscription Plans
export async function handleGetSubscriptionPlans(req: Request, res: Response) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Middleware to verify JWT token
export function verifyToken(req: Request, res: Response, next: any) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token.'
    });
  }
}

// Middleware to verify admin token
export function verifyAdminToken(req: Request, res: Response, next: any) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token.'
    });
  }
}