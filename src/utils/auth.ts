import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verify JWT token from httpOnly cookie
 * Attaches user data to req.user if valid
 */
export const verifyJwt = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies.authToken;

    if (!token) {
      req.log.warn('No auth token provided');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      req.log.warn('JWT token expired');
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      req.log.warn('Invalid JWT token', { message: error.message });
      res.status(401).json({ error: 'Invalid token' });
    } else {
      req.log.error('JWT verification error', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
};

/**
 * Generate a new JWT token
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });
};

/**
 * Set JWT token in httpOnly cookie
 */
export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear auth cookie
 */
export const clearAuthCookie = (res: Response): void => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};
