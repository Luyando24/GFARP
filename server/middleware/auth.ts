import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.header('authorization');
  console.log('[AUTH DEBUG] Auth header:', authHeader);
  
  const token = authHeader?.split(' ')[1];
  console.log('[AUTH DEBUG] Token extracted:', token ? `${token.substring(0, 10)}...` : 'null');

  if (!token) {
    console.log('[AUTH DEBUG] No token found in request');
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH DEBUG] Token verified for user:', decoded.id);
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