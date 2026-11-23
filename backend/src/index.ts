/**
 * ShopStock Backend Entry Point
 * Express.js + MongoDB + Prisma + Socket.io
 */

import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { MongoClient, Db } from 'mongodb';

import { config, validateConfig } from './config';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import { setupWebSocket } from './websocket';
import { setupRoutes } from './routes';
import { setupCronJobs } from './jobs';
import { logger } from './utils/logger';

// ============================================
// Initialize Prisma Client
// ============================================

export const prisma = new PrismaClient({
  log: config.app.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// ============================================
// Initialize MongoDB Native Client (for operations requiring replica set)
// ============================================

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

export async function connectMongo(): Promise<void> {
  try {
    mongoClient = new MongoClient(config.database.url);
    await mongoClient.connect();
    // Extract database name from URL
    const url = new URL(config.database.url);
    const dbName = url.pathname.slice(1) || 'shopstock';
    mongoDb = mongoClient.db(dbName);
    logger.info('MongoDB native client connected', { database: dbName });
  } catch (error) {
    logger.error('Failed to connect MongoDB native client:', error);
    throw error;
  }
}

export function getMongoDb(): Db {
  if (!mongoDb) {
    throw new Error('MongoDB not initialized. Call connectMongo() first.');
  }
  return mongoDb;
}

export async function disconnectMongo(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
    logger.info('MongoDB native client disconnected');
  }
}

// ============================================
// Create Express App
// ============================================

const app = express();
const httpServer = createServer(app);

// ============================================
// Trust Proxy (for rate limiting behind proxy)
// ============================================

app.set('trust proxy', 1);

// ============================================
// Security Middleware
// ============================================

if (config.security.helmetEnabled) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable for API
  }));
}

// ============================================
// CORS
// ============================================

if (config.security.corsEnabled) {
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  }));
}

// ============================================
// Body Parsing
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ============================================
// Logging
// ============================================

if (config.app.env !== 'test') {
  app.use(morgan(config.logging.prettyPrint ? 'dev' : 'combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

app.use(requestLogger);

// ============================================
// Rate Limiting
// ============================================

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

app.use('/api/v1/auth', authLimiter);

// ============================================
// Health Check
// ============================================

app.get('/health', async (req, res) => {
  try {
    await (prisma as any).$runCommandRaw({ ping: 1 });
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config.app.version,
        environment: config.app.env,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failed',
      },
    });
  }
});

app.get('/health/ready', async (req, res) => {
  try {
    await (prisma as any).$runCommandRaw({ ping: 1 });
    res.json({ success: true, data: { ready: true } });
  } catch {
    res.status(503).json({ success: false, data: { ready: false } });
  }
});

// ============================================
// API Routes
// ============================================

setupRoutes(app);

// ============================================
// 404 Handler
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ============================================
// Global Error Handler
// ============================================

app.use(errorHandler);

// ============================================
// WebSocket Setup
// ============================================

let io: ReturnType<typeof setupWebSocket> | null = null;

if (config.websocket.enabled) {
  io = setupWebSocket(httpServer, prisma);
  logger.info('WebSocket server initialized');
}

// ============================================
// Cron Jobs Setup
// ============================================

if (config.app.env !== 'test') {
  setupCronJobs(prisma, io);
  logger.info('Cron jobs initialized');
}

// ============================================
// Graceful Shutdown
// ============================================

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    // Close WebSocket connections
    if (io) {
      io.close();
      logger.info('WebSocket server closed');
    }

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('Prisma disconnected');

    // Disconnect MongoDB native client
    await disconnectMongo();
    logger.info('MongoDB native client disconnected');

    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// ============================================
// Start Server
// ============================================

const startServer = async () => {
  try {
    // Validate configuration
    validateConfig();

    // Connect to database (Prisma)
    await prisma.$connect();
    logger.info('Database connected (Prisma)');

    // Connect to MongoDB native client (for write operations)
    await connectMongo();
    logger.info('Database connected (MongoDB native)');

    // Start HTTP server
    httpServer.listen(config.app.port, () => {
      logger.info(`🚀 Server running on port ${config.app.port}`);
      logger.info(`📝 Environment: ${config.app.env}`);
      logger.info(`🔗 API: http://localhost:${config.app.port}${config.app.apiPrefix}`);
      logger.info(`💚 Health: http://localhost:${config.app.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start if not in test mode
if (config.app.env !== 'test') {
  startServer();
}

export { app, httpServer, io };