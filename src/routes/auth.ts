import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  verifyJwt,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from '@/utils/auth';
import { asyncHandler, ApiError } from '@/utils/errors';

const router = Router();

// Assume these come from @workspace/api-zod
// In production, these would be imported from the shared package
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const body = RegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ApiError(409, 'User already exists', 'USER_EXISTS');
    }

    // In production, hash the password with bcrypt
    const passwordHash = body.password; // TODO: Use bcrypt

    const newUser = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
      })
      .returning();

    const user = newUser[0];
    req.log.info('User registered', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  })
);

/**
 * POST /api/auth/login
 * Login a user
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const body = LoginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!user) {
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // In production, use bcrypt.compare
    const isPasswordValid = user.passwordHash === body.password; // TODO: Use bcrypt

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    req.log.info('User logged in', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    setAuthCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout a user
 */
router.post('/logout', (req: Request, res: Response) => {
  req.log.info('User logged out');
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user (requires JWT)
 */
router.get(
  '/me',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      },
    });
  })
);

export default router;
