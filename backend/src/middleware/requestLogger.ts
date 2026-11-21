/**
 * Request Logger Middleware
 * Logs incoming requests with timing and context
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

// ============================================
// Request Logger
// ============================================

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = (res as any).requestId || 'unknown';

  // Log request
  logger.debug('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    shopId: (req as any).user?.shopId,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body?: any): Response {
    const duration = Date.now() - startTime;

    // Log response
    logger.debug('Response sent', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.get('content-length'),
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        path: req.path,
        durationMs: duration,
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

// ============================================
// Audit Logger Helper
// ============================================

export interface AuditLogEntry {
  actorId: string;
  shopId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: Prisma.InputJsonValue;
  afterJson?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Import prisma dynamically to avoid circular dependency
    const { prisma } = await import('../index.js');
    await prisma.auditLog.create({
      data: entry,
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    logger.error('Failed to create audit log:', error);
  }
}

// ============================================
// Audit Log Helpers
// ============================================

export function logCreate(
  req: Request,
  entityType: string,
  entityId: string,
  afterData: Record<string, unknown>
): void {
  if (!(req as any).user) return;

  createAuditLog({
    actorId: (req as any).user.id,
    shopId: (req as any).user.shopId,
    action: 'CREATE',
    entityType,
    entityId,
    afterJson: afterData as Prisma.InputJsonValue,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export function logUpdate(
  req: Request,
  entityType: string,
  entityId: string,
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>
): void {
  if (!(req as any).user) return;

  createAuditLog({
    actorId: (req as any).user.id,
    shopId: (req as any).user.shopId,
    action: 'UPDATE',
    entityType,
    entityId,
    beforeJson: beforeData as Prisma.InputJsonValue,
    afterJson: afterData as Prisma.InputJsonValue,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export function logDelete(
  req: Request,
  entityType: string,
  entityId: string,
  beforeData: Record<string, unknown>
): void {
  if (!(req as any).user) return;

  createAuditLog({
    actorId: (req as any).user.id,
    shopId: (req as any).user.shopId,
    action: 'DELETE',
    entityType,
    entityId,
    beforeJson: beforeData as Prisma.InputJsonValue,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export function logAction(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  data?: Record<string, unknown>
): void {
  if (!(req as any).user) return;

  createAuditLog({
    actorId: (req as any).user.id,
    shopId: (req as any).user.shopId,
    action,
    entityType,
    entityId,
    afterJson: data as Prisma.InputJsonValue,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}