import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction) {
  const authHeader = req.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded as {
      id: string;
      email: string;
      name: string;
    };
    return next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}