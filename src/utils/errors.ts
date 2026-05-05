import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error handling middleware
 * Catches all errors and formats them consistently
 */
export const errorHandler = (
  err: Error | ApiError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestLog = (global as any).requestLogger || console;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    requestLog.warn('Validation error', { errors });
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    });
    return;
  }

  // Handle API errors
  if (err instanceof ApiError) {
    requestLog.warn(err.message, { code: err.code, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Handle unknown errors
  requestLog.error('Unexpected error', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

/**
 * Middleware to catch async route errors and pass to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
