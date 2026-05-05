import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyJwt } from '@/utils/auth';
import { asyncHandler } from '@/utils/errors';

const router = Router();

// Validation schemas
const CreateListingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  dataType: z.string().min(1, 'Data type is required'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'),
  currency: z.string().length(3).default('USD'),
  peptideIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().default(true),
});

const UpdateListingSchema = CreateListingSchema.partial();

/**
 * GET /api/data-listings
 * List available data listings
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    req.log.info('Fetching data listings');
    // TODO: Implement
    res.json({ listings: [] });
  })
);

/**
 * POST /api/data-listings
 * Create a new data listing (requires authentication)
 */
router.post(
  '/',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateListingSchema.parse(req.body);
    req.log.info('Data listing creation requested', {
      userId: req.user!.userId,
      title: body.title,
    });
    // TODO: Implement
    res.status(201).json({ message: 'Listing created' });
  })
);

/**
 * GET /api/data-listings/:id
 * Get a specific listing
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    req.log.info('Fetching data listing', { listingId: req.params.id });
    // TODO: Implement
    res.json({ listing: {} });
  })
);

/**
 * PATCH /api/data-listings/:id
 * Update a listing (owner only)
 */
router.patch(
  '/:id',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    const body = UpdateListingSchema.parse(req.body);
    req.log.info('Listing update requested', { listingId: req.params.id });
    // TODO: Implement
    res.json({ message: 'Listing updated' });
  })
);

/**
 * DELETE /api/data-listings/:id
 * Delete a listing (owner only)
 */
router.delete(
  '/:id',
  verifyJwt,
  asyncHandler(async (req: Request, res: Response) => {
    req.log.info('Listing deletion requested', { listingId: req.params.id });
    // TODO: Implement
    res.status(204).send();
  })
);

export default router;
