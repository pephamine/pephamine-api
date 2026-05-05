import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/db';
import { peptides, users } from '@/db/schema';
import { verifyJwt } from '@/utils/auth';
import { asyncHandler, ApiError } from '@/utils/errors';

const router = Router();

// Validation schemas
const CreatePeptideSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sequence: z.string().min(1, 'Sequence is required'),
  description: z.string().optional(),
  molecularWeight: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  isPublic: z.boolean().default(false),
});

const UpdatePeptideSchema = CreatePeptideSchema.partial();

const PeptideResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  sequence: z.string(),
  description: z.string().nullable(),
  molecularWeight: z.string().nullable(),
  properties: z.record(z.unknown()).nullable(),
  isPublic: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * GET /api/peptides
 * List peptides (public ones or user's own)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (userId) {
      // If authenticated, show public peptides + user's own
      const results = await db
        .select()
        .from(peptides)
        .where(
          sql`${peptides.isPublic} = true OR ${peptides.userId} = ${userId}`
        );
      res.json({ peptides: results });
    } else {
      // If not authenticated, show only public peptides
      const results = await db
        .select()
        .from(peptides)
        .where(eq(peptides.isPublic, true));
      res.json({ peptides: results });
    }
  })
);

/**
 * GET /api/peptides/:id
 * Get a specific peptide
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const [peptide] = await db
      .select()
      .from(peptides)
      .where(eq(peptides.id, req.params.id))
      .limit(1);

    if (!peptide) {
      throw new ApiError(404, 'Peptide not found', 'PEPTIDE_NOT_FOUND');
    }

    // Check permissions: public peptides or user owns it
    if (!peptide.isPublic && peptide.userId !== req.user?.userId) {
      throw new ApiError(403, 'Access denied', 'ACCESS_DENIED');
    }

    res.json({ peptide: PeptideResponseSchema.parse(peptide) });
  })
);

/**
 * POST /api/peptides
 * Create a new peptide (requires authentication)
 */
router.post(
  '/',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreatePeptideSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const newPeptide = await db
      .insert(peptides)
      .values({
        userId: req.user!.userId,
        name: body.name,
        sequence: body.sequence,
        description: body.description,
        molecularWeight: body.molecularWeight,
        properties: body.properties,
        isPublic: body.isPublic,
      })
      .returning();

    req.log.info('Peptide created', { peptideId: newPeptide[0].id, userId: req.user!.userId });

    res.status(201).json({ peptide: PeptideResponseSchema.parse(newPeptide[0]) });
  })
);

/**
 * PATCH /api/peptides/:id
 * Update a peptide (requires authentication + ownership)
 */
router.patch(
  '/:id',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    const [peptide] = await db
      .select()
      .from(peptides)
      .where(eq(peptides.id, req.params.id))
      .limit(1);

    if (!peptide) {
      throw new ApiError(404, 'Peptide not found', 'PEPTIDE_NOT_FOUND');
    }

    // Check ownership
    if (peptide.userId !== req.user!.userId) {
      throw new ApiError(403, 'Can only update your own peptides', 'ACCESS_DENIED');
    }

    const body = UpdatePeptideSchema.parse(req.body);

    const updated = await db
      .update(peptides)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(peptides.id, req.params.id))
      .returning();

    req.log.info('Peptide updated', { peptideId: req.params.id, userId: req.user!.userId });

    res.json({ peptide: PeptideResponseSchema.parse(updated[0]) });
  })
);

/**
 * DELETE /api/peptides/:id
 * Delete a peptide (requires authentication + ownership)
 */
router.delete(
  '/:id',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    const [peptide] = await db
      .select()
      .from(peptides)
      .where(eq(peptides.id, req.params.id))
      .limit(1);

    if (!peptide) {
      throw new ApiError(404, 'Peptide not found', 'PEPTIDE_NOT_FOUND');
    }

    // Check ownership
    if (peptide.userId !== req.user!.userId) {
      throw new ApiError(403, 'Can only delete your own peptides', 'ACCESS_DENIED');
    }

    await db.delete(peptides).where(eq(peptides.id, req.params.id));

    req.log.info('Peptide deleted', { peptideId: req.params.id, userId: req.user!.userId });

    res.status(204).send();
  })
);

export default router;
