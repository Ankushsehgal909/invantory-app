/**
 * Logger Utility
 * Winston-based structured logging
 */

import winston from 'winston';
import { config } from '../config';

// ============================================
// Log Format
// ============================================

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf((info: winston.Logform.TransformableInfo) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// ============================================
// Create Logger
// ============================================

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.logging.prettyPrint ? consoleFormat : logFormat,
    level: config.logging.level,
  }),
];

// Add file transport in production
if (config.app.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: config.app.name,
    version: config.app.version,
    environment: config.app.env,
  },
  transports,
  exitOnError: false,
});

// ============================================
// Helper Functions
// ============================================

export function createChildLogger(meta: Record<string, unknown>): winston.Logger {
  return logger.child(meta);
}

export function logError(
  logger: winston.Logger,
  error: Error,
  context?: Record<string, unknown>
): void {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  });
}

export function logApiCall(
  logger: winston.Logger,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: Record<string, unknown>
): void {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'API call', {
    method,
    path,
    statusCode,
    durationMs,
    ...context,
  });
}

export function logDbQuery(
  logger: winston.Logger,
  query: string,
  durationMs: number,
  context?: Record<string, unknown>
): void {
  logger.debug('Database query', {
    query: query.length > 500 ? query.substring(0, 500) + '...' : query,
    durationMs,
    ...context,
  });
}

export function logBusinessEvent(
  logger: winston.Logger,
  event: string,
  context: Record<string, unknown>
): void {
  logger.info(`Business event: ${event}`, context);
}

// ============================================
// Request-scoped Logger
// ============================================

export function createRequestLogger(requestId: string, userId?: string, shopId?: string): winston.Logger {
  return logger.child({
    requestId,
    userId,
    shopId,
  });
}