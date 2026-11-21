/**
 * Authentication Middleware
 * JWT-based authentication with access/refresh token rotation
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { config } from '../config';
import { AppError, AuthenticationError, AuthorizationError } from './errorHandler';
import { UserRole, UserStatus, ERROR_CODES } from '@shopstock/shared/constants';
import { logger } from '../utils/logger';

// ============================================
// Types
// ============================================

export interface JwtPayload {
  userId: string;
  shopId: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    shopId: string;
    role: UserRole;
    name: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

// ============================================
// Token Utilities
// ============================================

export function generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessExpiry,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiry,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  }) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

// ============================================
// Authentication Middleware
// ============================================

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    // Verify token
    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Access token expired');
      }
      throw new AuthenticationError('Invalid access token');
    }

    // Check token type
    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        shopId: true,
        role: true,
        name: true,
        status: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify shop still exists
    const shop = await prisma.shop.findUnique({
      where: { id: payload.shopId },
      select: { id: true },
    });

    if (!shop) {
      throw new AuthenticationError('Shop not found');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      shopId: user.shopId,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================
// Optional Authentication Middleware
// ============================================

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        shopId: true,
        role: true,
        name: true,
        status: true,
      },
    });

    if (user && user.status === UserStatus.ACTIVE) {
      req.user = {
        id: user.id,
        shopId: user.shopId,
        role: user.role,
        name: user.name,
      };
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
};

// ============================================
// Role-based Authorization Middleware
// ============================================

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError(`Required role: ${allowedRoles.join(' or ')}`));
    }

    next();
  };
}

export function requireOwnerOrManager() {
  return requireRole(UserRole.OWNER, UserRole.MANAGER);
}

export function requireOwner() {
  return requireRole(UserRole.OWNER);
}

// ============================================
// Shop Isolation Middleware
// ============================================

export const shopIsolationMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError());
  }

  // Ensure user can only access their shop's data
  // This is enforced at the query level, but we can add additional checks here
  // For example, if a shopId is provided in params/body, verify it matches user's shop
  const paramShopId = req.params.shopId || req.body.shopId || req.query.shopId;

  if (paramShopId && paramShopId !== req.user.shopId) {
    return next(new AuthorizationError('Access denied to this shop'));
  }

  next();
};

// ============================================
// Idempotency Middleware
// ============================================

export const idempotencyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    return next(); // Optional for now
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return next(new AppError(ERROR_CODES.INVALID_INPUT, 'Invalid idempotency key format', 400));
  }

  // Check if key exists (using Redis or database)
  // For now, we'll store in memory - in production use Redis
  const existing = (global as any).idempotencyKeys?.[idempotencyKey];
  if (existing) {
    // Return cached response
    return res.status(existing.statusCode).json(existing.response);
  }

  // Store response for future requests
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (!global.idempotencyKeys) global.idempotencyKeys = {};
    global.idempotencyKeys[idempotencyKey] = {
      statusCode: res.statusCode,
      response: body,
      timestamp: Date.now(),
    };
    // Clean up old keys periodically
    if (Object.keys(global.idempotencyKeys).length > 10000) {
      const now = Date.now();
      Object.entries(global.idempotencyKeys).forEach(([key, value]: [string, any]) => {
        if (now - value.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
          delete global.idempotencyKeys[key];
        }
      });
    }
    return originalJson(body);
  };

  next();
};

// ============================================
// Request ID Middleware
// ============================================

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  (res as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// ============================================
// Permission Check Helpers
// ============================================

export const PERMISSIONS = {
  // Shop management
  MANAGE_SHOP: [UserRole.OWNER],
  MANAGE_USERS: [UserRole.OWNER],
  MANAGE_SETTINGS: [UserRole.OWNER],
  BACKUP_RESTORE: [UserRole.OWNER],
  VIEW_AUDIT_LOG: [UserRole.OWNER],

  // Product management
  MANAGE_PRODUCTS: [UserRole.OWNER, UserRole.MANAGER],
  MANAGE_CATEGORIES: [UserRole.OWNER, UserRole.MANAGER],
  VIEW_PRODUCTS: [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER],

  // Supplier management
  MANAGE_SUPPLIERS: [UserRole.OWNER, UserRole.MANAGER],

  // Customer management
  MANAGE_CUSTOMERS: [UserRole.OWNER, UserRole.MANAGER],

  // Purchases
  CREATE_PURCHASE: [UserRole.OWNER, UserRole.MANAGER],
  EDIT_PURCHASE: [UserRole.OWNER, UserRole.MANAGER],
  DELETE_PURCHASE: [UserRole.OWNER],
  VIEW_PURCHASES: [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER],

  // Sales
  CREATE_SALE: [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF],
  EDIT_SALE: [UserRole.OWNER, UserRole.MANAGER],
  DELETE_SALE: [UserRole.OWNER],
  VIEW_SALES: [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER],

  // Stock
  MANAGE_STOCK: [UserRole.OWNER, UserRole.MANAGER],
  CREATE_ADJUSTMENT: [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF],

  // Reports
  VIEW_REPORTS: [UserRole.OWNER, UserRole.MANAGER, UserRole.VIEWER],
  EXPORT_DATA: [UserRole.OWNER, UserRole.MANAGER, UserRole.VIEWER],

  // Payments
  MANAGE_PAYMENTS: [UserRole.OWNER, UserRole.MANAGER],
  VIEW_PAYMENTS: [UserRole.OWNER, UserRole.MANAGER, UserRole.VIEWER],

  // Notifications
  MANAGE_NOTIFICATIONS: [UserRole.OWNER, UserRole.MANAGER],
} as const;

export function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(userRole);
}

export function requirePermission(permission: keyof typeof PERMISSIONS) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(new AuthorizationError(`Permission required: ${permission}`));
    }

    next();
  };
}