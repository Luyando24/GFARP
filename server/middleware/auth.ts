import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    // Attach decoded user onto request (module augmentation ensures typing)
    (req as any).user = decoded as {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    next();
  } catch (err: any) {
    console.error('[AUTH DEBUG] Token verification failed:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: err.message
    });
  }
};
