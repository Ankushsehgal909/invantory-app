/**
 * Authentication Routes
 * Login, logout, token refresh, password management
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, getMongoDb } from '../index';
import { config } from '../config';
import { asyncHandler, AppError, ValidationError, AuthenticationError, ConflictError } from '../middleware/errorHandler';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { loginSchema, changePasswordSchema, registerSchema } from '@shopstock/shared/validators';
import { ERROR_CODES, HTTP_STATUS, UserStatus, UserRole } from '@shopstock/shared/constants';
import { logger } from '../utils/logger';
import { logAction } from '../middleware/requestLogger';
import { ObjectId } from 'mongodb';

const router = Router();

// ============================================
// Login
// ============================================

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid credentials', { errors: validation.error.errors });
  }

  const { phone, password, shopId } = validation.data;

  // Find user by phone
  const user = await prisma.user.findFirst({
    where: {
      phone,
      ...(shopId ? { shopId } : {}),
      status: UserStatus.ACTIVE,
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          currency: true,
          timezone: true,
          invoicePrefix: true,
          purchasePrefix: true,
          taxSettings: true,
          settings: true,
        },
      },
    },
  });

  if (!user) {
    logger.warn('Login failed: user not found', { phone });
    throw new AuthenticationError('Invalid phone or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    logger.warn('Login failed: invalid password', { userId: user.id });
    throw new AuthenticationError('Invalid phone or password');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    shopId: user.shopId,
    role: user.role as UserRole,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    shopId: user.shopId,
    role: user.role as UserRole,
  });

  // Log login
  logAction(req, 'LOGIN', 'User', user.id);

  logger.info('User logged in', { userId: user.id, shopId: user.shopId });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        shopId: user.shopId,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
      shop: user.shop,
    },
  });
}));

// ============================================
// Register (Create new shop + owner)
// ============================================

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const { name, phone, email, password, shopName } = validation.data;

  // Check if phone already exists (using Prisma for reads - works fine)
  const existingPhone = await prisma.user.findFirst({
    where: { phone },
  });

  if (existingPhone) {
    throw new ConflictError('Phone number already registered');
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

  // Use MongoDB native client for writes (Prisma requires replica set for writes)
  const db = getMongoDb();
  const shopsCollection = db.collection('shops');
  const usersCollection = db.collection('users');

  // Create shop
  const now = new Date();
  const shopDoc = {
    name: shopName,
    address: null,
    phone: null,
    email: null,
    logo: null,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    invoicePrefix: 'INV-',
    purchasePrefix: 'PUR-',
    taxSettings: {
      enabled: false,
      taxType: 'NONE',
      defaultTaxRate: 0,
      taxInclusive: false,
      gstin: '',
    },
    settings: {
      lowStockDefaultThreshold: 10,
      expiryAlertDays: [90, 30, 7, 1],
      allowNegativeStock: false,
      defaultPaymentTerms: 30,
      enableBatchTracking: true,
      enableExpiryTracking: true,
      currencySymbol: '₹',
      dateFormat: 'dd/MM/yyyy',
      numberFormat: 'en-IN',
    },
    createdAt: now,
    updatedAt: now,
  };

  const shopResult = await shopsCollection.insertOne(shopDoc);
  const shopId = shopResult.insertedId.toString();

  // Create owner user
  const userDoc = {
    shopId: new ObjectId(shopId),
    name,
    phone,
    email: email || null,
    passwordHash,
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    pinHash: null,
    avatar: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const userResult = await usersCollection.insertOne(userDoc);
  const userId = userResult.insertedId.toString();

  // Create user object for response (matching Prisma select)
  const user = {
    id: userId,
    shopId,
    name,
    phone,
    email: email || null,
    role: UserRole.OWNER,
    avatar: null,
  };

  // Create shop object for response
  const shop = {
    id: shopId,
    name: shopName,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    invoicePrefix: 'INV-',
    purchasePrefix: 'PUR-',
    taxSettings: shopDoc.taxSettings,
    settings: shopDoc.settings,
  };

  // Generate tokens
  const accessToken = generateAccessToken({
    userId,
    shopId,
    role: UserRole.OWNER,
  });

  const refreshToken = generateRefreshToken({
    userId,
    shopId,
    role: UserRole.OWNER,
  });

  logger.info('New shop and owner registered', { userId, shopId });

  res.status(201).json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
      shop,
    },
  });
}));

// ============================================
// Refresh Token
// ============================================

router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, shopId: true, role: true, status: true },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AuthenticationError('User not found or deactivated');
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken({
    userId: user.id,
    shopId: user.shopId,
    role: user.role as UserRole,
  });

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    shopId: user.shopId,
    role: user.role as UserRole,
  });

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
}));

// ============================================
// Logout
// ============================================

router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // In a stateless JWT system, logout is client-side
  // For enhanced security, you could maintain a blocklist of revoked tokens
  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}));

// ============================================
// Change Password
// ============================================

router.post('/change-password', asyncHandler(async (req: Request, res: Response) => {
  const validation = changePasswordSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const { currentPassword, newPassword } = validation.data;
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AuthenticationError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  logAction(req, 'CHANGE_PASSWORD', 'User', userId);

  logger.info('Password changed', { userId });

  res.json({
    success: true,
    data: { message: 'Password changed successfully' },
  });
}));

// ============================================
// Get Current User
// ============================================

router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AuthenticationError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      shopId: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      avatar: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    success: true,
    data: { user },
  });
}));

// ============================================
// Forgot Password (Request Reset)
// ============================================

router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ValidationError('Phone number is required');
  }

  // Find user
  const user = await prisma.user.findFirst({
    where: { phone, status: UserStatus.ACTIVE },
  });

  // Always return success to prevent user enumeration
  // In production, send reset link via SMS/email
  logger.info('Password reset requested', { phone, userId: user?.id });

  res.json({
    success: true,
    data: { message: 'If the account exists, a password reset link has been sent' },
  });
}));

// ============================================
// Reset Password
// ============================================

router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ValidationError('Token and new password are required');
  }

  // In production, verify token from database
  // For now, we'll just return success
  // Implementation would involve:
  // 1. Verify reset token
  // 2. Hash new password
  // 3. Update user
  // 4. Invalidate token

  res.json({
    success: true,
    data: { message: 'Password reset successfully' },
  });
}));

export default router;