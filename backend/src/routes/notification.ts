/**
 * Notification Routes
 * In-app notifications management
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { logUpdate } from '../middleware/requestLogger';
import { NotificationType, NotificationStatus } from '@shopstock/shared/constants';

const router = Router();

// ============================================
// List Notifications
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { page = 1, limit = 50, type, status, unreadOnly } = req.query;

  const where: any = { shopId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (unreadOnly === 'true') where.status = { in: [NotificationStatus.PENDING, NotificationStatus.SENT] };

  // For staff, only show their notifications or global ones
  const userRole = (req as any).user?.role;
  if (userRole === 'STAFF') {
    where.OR = [
      { entityType: 'User', entityId: userId },
      { entityType: { not: 'User' } }, // Global notifications
    ];
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { shopId, status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] } } }),
  ]);

  res.json({
    success: true,
    data: { notifications, unreadCount },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Get Notification by ID
// ============================================

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({ where: { id, shopId } });
  if (!notification) throw new NotFoundError('Notification');

  res.json({ success: true, data: { notification } });
}));

// ============================================
// Mark Notification as Read
// ============================================

router.post('/:id/read', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({ where: { id, shopId } });
  if (!notification) throw new NotFoundError('Notification');

  await prisma.notification.update({
    where: { id },
    data: { status: NotificationStatus.READ, readAt: new Date() },
  });

  logUpdate(req, 'Notification', id, { status: notification.status }, { status: NotificationStatus.READ });

  res.json({ success: true, data: { message: 'Notification marked as read' } });
}));

// ============================================
// Mark All as Read
// ============================================

router.post('/read-all', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;

  const where: any = { shopId, status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] } };

  if (userRole === 'STAFF') {
    where.OR = [
      { entityType: 'User', entityId: userId },
      { entityType: { not: 'User' } },
    ];
  }

  await prisma.notification.updateMany({
    where,
    data: { status: NotificationStatus.READ, readAt: new Date() },
  });

  res.json({ success: true, data: { message: 'All notifications marked as read' } });
}));

// ============================================
// Dismiss Notification
// ============================================

router.post('/:id/dismiss', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({ where: { id, shopId } });
  if (!notification) throw new NotFoundError('Notification');

  await prisma.notification.update({
    where: { id },
    data: { status: NotificationStatus.DISMISSED },
  });

  logUpdate(req, 'Notification', id, { status: notification.status }, { status: NotificationStatus.DISMISSED });

  res.json({ success: true, data: { message: 'Notification dismissed' } });
}));

// ============================================
// Notification Types Reference
// ============================================

router.get('/meta/types', asyncHandler(async (req, res) => {
  const types = Object.values(NotificationType).map(t => ({ value: t, label: t }));
  res.json({ success: true, data: { types } });
}));

// ============================================
// Notification Statuses Reference
// ============================================

router.get('/meta/statuses', asyncHandler(async (req, res) => {
  const statuses = Object.values(NotificationStatus).map(s => ({ value: s, label: s }));
  res.json({ success: true, data: { statuses } });
}));

export default router;