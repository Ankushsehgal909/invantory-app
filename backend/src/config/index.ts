/**
 * Backend Configuration
 * Centralized configuration management
 */

import dotenv from 'dotenv';
dotenv.config();

// ============================================
// Environment Validation
// ============================================

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value for ${key}: ${value}`);
  }
  return parsed;
}

function getEnvBool(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.toLowerCase() === 'true';
}

// ============================================
// Configuration Object
// ============================================

export const config = {
  // Application
  app: {
    name: getEnv('APP_NAME', 'ShopStock'),
    version: getEnv('APP_VERSION', '1.0.0'),
    env: getEnv('NODE_ENV', 'development'),
    port: getEnvInt('PORT', 4000),
    apiPrefix: getEnv('API_PREFIX', '/api/v1'),
    frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000'),
    mobileUrl: getEnv('MOBILE_URL', 'http://localhost:8081'),
  },

  // Database
  database: {
    url: getEnv('DATABASE_URL'),
    // Prisma handles connection pooling for MongoDB
  },

  // JWT
  jwt: {
    accessSecret: getEnv('JWT_ACCESS_SECRET'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET'),
    accessExpiry: getEnv('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: getEnv('JWT_REFRESH_EXPIRY', '7d'),
    issuer: getEnv('JWT_ISSUER', 'shopstock'),
    audience: getEnv('JWT_AUDIENCE', 'shopstock-app'),
  },

  // Redis (for caching, sessions, rate limiting)
  redis: {
    url: getEnv('REDIS_URL', 'redis://localhost:6379'),
    enabled: getEnvBool('REDIS_ENABLED', false),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
    authMaxRequests: getEnvInt('AUTH_RATE_LIMIT_MAX_REQUESTS', 10),
  },

  // CORS
  cors: {
    origin: getEnv('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: true,
  },

  // File Upload
  upload: {
    maxFileSize: getEnvInt('MAX_FILE_SIZE', 10 * 1024 * 1024),
    uploadDir: getEnv('UPLOAD_DIR', './uploads'),
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'text/csv'],
  },

  // Email (for notifications, password reset)
  email: {
    host: getEnv('SMTP_HOST', 'localhost'),
    port: getEnvInt('SMTP_PORT', 587),
    secure: getEnvBool('SMTP_SECURE', false),
    user: getEnv('SMTP_USER'),
    pass: getEnv('SMTP_PASS'),
    from: getEnv('SMTP_FROM', 'noreply@shopstock.app'),
  },

  // SMS/WhatsApp (for notifications)
  sms: {
    provider: getEnv('SMS_PROVIDER', 'twilio'),
    accountSid: getEnv('TWILIO_ACCOUNT_SID'),
    authToken: getEnv('TWILIO_AUTH_TOKEN'),
    fromNumber: getEnv('TWILIO_FROM_NUMBER'),
  },

  // Push Notifications
  push: {
    vapidPublicKey: getEnv('VAPID_PUBLIC_KEY'),
    vapidPrivateKey: getEnv('VAPID_PRIVATE_KEY'),
    vapidSubject: getEnv('VAPID_SUBJECT', 'mailto:admin@shopstock.app'),
  },

  // Logging
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    prettyPrint: getEnvBool('LOG_PRETTY_PRINT', true),
  },

  // Security
  security: {
    bcryptRounds: getEnvInt('BCRYPT_ROUNDS', 12),
    helmetEnabled: getEnvBool('HELMET_ENABLED', true),
    corsEnabled: getEnvBool('CORS_ENABLED', true),
  },

  // WebSocket
  websocket: {
    enabled: getEnvBool('WS_ENABLED', true),
    pingInterval: getEnvInt('WS_PING_INTERVAL', 25000),
    pingTimeout: getEnvInt('WS_PING_TIMEOUT', 20000),
  },

  // Sync
  sync: {
    batchSize: getEnvInt('SYNC_BATCH_SIZE', 100),
    maxRetries: getEnvInt('SYNC_MAX_RETRIES', 3),
    retryDelayMs: getEnvInt('SYNC_RETRY_DELAY_MS', 1000),
  },

  // Backup
  backup: {
    enabled: getEnvBool('BACKUP_ENABLED', true),
    schedule: getEnv('BACKUP_SCHEDULE', '0 2 * * *'), // Daily at 2 AM
    retentionDays: getEnvInt('BACKUP_RETENTION_DAYS', 30),
    storagePath: getEnv('BACKUP_STORAGE_PATH', './backups'),
  },
} as const;

// ============================================
// Type Exports
// ============================================

export type Config = typeof config;
export type AppConfig = typeof config.app;
export type DatabaseConfig = typeof config.database;
export type JwtConfig = typeof config.jwt;
export type RedisConfig = typeof config.redis;
export type RateLimitConfig = typeof config.rateLimit;
export type CorsConfig = typeof config.cors;
export type UploadConfig = typeof config.upload;
export type EmailConfig = typeof config.email;
export type SmsConfig = typeof config.sms;
export type PushConfig = typeof config.push;
export type LoggingConfig = typeof config.logging;
export type SecurityConfig = typeof config.security;
export type WebsocketConfig = typeof config.websocket;
export type SyncConfig = typeof config.sync;
export type BackupConfig = typeof config.backup;

// ============================================
// Validation
// ============================================

export function validateConfig(): void {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secrets are strong enough
  if (config.jwt.accessSecret.length < 32) {
    console.warn('WARNING: JWT_ACCESS_SECRET should be at least 32 characters');
  }
  if (config.jwt.refreshSecret.length < 32) {
    console.warn('WARNING: JWT_REFRESH_SECRET should be at least 32 characters');
  }

  // Validate secrets are different
  if (config.jwt.accessSecret === config.jwt.refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }
}