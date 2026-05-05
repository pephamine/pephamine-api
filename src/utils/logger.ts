import { Request } from 'express';

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Simple console-based logger that respects the no-console.log rule
 * by using console methods directly for structured logging
 */
const createLogger = (): Logger => {
  const formatTimestamp = () => new Date().toISOString();
  const formatMeta = (meta?: Record<string, unknown>) =>
    meta ? ` ${JSON.stringify(meta)}` : '';

  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.info(
        `[${formatTimestamp()}] [INFO] ${message}${formatMeta(meta)}`
      );
    },
    error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
      const errorStr =
        error instanceof Error
          ? ` ${error.message}\n${error.stack}`
          : error
            ? ` ${String(error)}`
            : '';
      console.error(
        `[${formatTimestamp()}] [ERROR] ${message}${errorStr}${formatMeta(meta)}`
      );
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(
        `[${formatTimestamp()}] [WARN] ${message}${formatMeta(meta)}`
      );
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          `[${formatTimestamp()}] [DEBUG] ${message}${formatMeta(meta)}`
        );
      }
    },
  };
};

// Export singleton logger instance
export const logger = createLogger();

/**
 * Attach logger to Express Request object for use in route handlers
 * This allows using req.log instead of console.log
 */
declare global {
  namespace Express {
    interface Request {
      log: Logger;
    }
  }
}

export const createRequestLogger = () => {
  return (req: Request, _res: any, next: any) => {
    req.log = logger;
    next();
  };
};
