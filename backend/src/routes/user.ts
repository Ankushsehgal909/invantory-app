/**
 * User Routes
 * User management (owner/manager only)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { config } from '../config';
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { requireRole, requirePermission, UserRole } from '../middleware/auth';
import { createUserSchema, updateUserSchema } from '@shopstock/shared/validators';
import { UserStatus } from '@shopstock/shared/constants';
import { logCreate, logUpdate, logDelete, logAction } from '../middleware/requestLogger';

const router = Router();

// ============================================
// List Users
// ============================================

router.get('/', requirePermission('MANAGE_USERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 20, search, role, status } = req.query;

  const where: any = { shopId };

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: { users },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    },
  });
}));

// ============================================
// Get User by ID
// ============================================

router.get('/:id', requirePermission('MANAGE_USERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const user = await prisma.user.findFirst({
    where: { id, shopId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({ success: true, data: { user } });
}));

// ============================================
// Create User
// ============================================

router.post('/', requirePermission('MANAGE_USERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const validation = createUserSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const { phone, email, password, ...rest } = validation.data;

  // Check for duplicates
  const existing = await prisma.user.findFirst({
    where: {
      shopId,
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existing) {
    throw new ConflictError('Phone or email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      ...rest,
      shopId,
      phone,
      email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  logCreate(req, 'User', user.id, validation.data);

  res.status(201).json({ success: true, data: { user } });
}));

// ============================================
// Update User
// ============================================

router.put('/:id', requirePermission('MANAGE_USERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const validation = updateUserSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const user = await prisma.user.findFirst({
    where: { id, shopId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent owner from being demoted
  if (user.role === UserRole.OWNER && validation.data.role && validation.data.role !== UserRole.OWNER) {
    throw new ValidationError('Cannot change owner role');
  }

  // Prevent self-demotion
  const currentUserId = (req as any).user?.id;
  if (id === currentUserId && validation.data.role && validation.data.role !== UserRole.OWNER) {
    throw new ValidationError('Cannot change your own role');
  }

  // Check for duplicates
  if (validation.data.phone || validation.data.email) {
    const existing = await prisma.user.findFirst({
      where: {
        shopId,
        id: { not: id },
        OR: [
          ...(validation.data.phone ? [{ phone: validation.data.phone }] : []),
          ...(validation.data.email ? [{ email: validation.data.email }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictError('Phone or email already exists');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: validation.data,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      updatedAt: true,
    },
  });

  logUpdate(req, 'User', id, {}, validation.data);

  res.json({ success: true, data: { user: updatedUser } });
}));

// ============================================
// Delete User (Soft Delete - Deactivate)
// ============================================

router.delete('/:id', requirePermission('MANAGE_USERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const currentUserId = (req as any).user?.id;

  const user = await prisma.user.findFirst({
    where: { id, shopId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent self-deletion
  if (id === currentUserId) {
    throw new ValidationError('Cannot delete your own account');
  }

  // Prevent owner deletion
  if (user.role === UserRole.OWNER) {
    throw new ValidationError('Cannot delete owner account');
  }

  // Soft delete - deactivate
  await prisma.user.update({
    where: { id },
    data: { status: UserStatus.INACTIVE },
  });

  logDelete(req, 'User', id, {});

  res.json({ success: true, data: { message: 'User deactivated successfully' } });
}));

// ============================================
// Reset User Password
// ============================================

router.post('/:id/reset-password', requirePermission('MANAGE_USERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters');
  }

  const user = await prisma.user.findFirst({
    where: { id, shopId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  logAction(req, 'RESET_PASSWORD', 'User', id);

  res.json({ success: true, data: { message: 'Password reset successfully' } });
}));

export default router;