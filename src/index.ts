import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { logger, createRequestLogger } from './utils/logger';
import { errorHandler } from './utils/errors';

// Import routes
import authRoutes from './routes/auth';
import peptidesRoutes from './routes/peptides';
import protocolsRoutes from './routes/protocols';
import researchBondsRoutes from './routes/researchBonds';
import dataListingsRoutes from './routes/dataListings';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Logger middleware - attach to req.log
app.use(createRequestLogger());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/peptides', peptidesRoutes);
app.use('/api/protocols', protocolsRoutes);
app.use('/api/research-bonds', researchBondsRoutes);
app.use('/api/data-listings', dataListingsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`, { port: PORT, env: process.env.NODE_ENV });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
