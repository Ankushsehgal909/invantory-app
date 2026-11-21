/**
 * Cron Jobs Setup
 * Scheduled tasks for notifications, cleanup, backups
 */

import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import { formatCurrency, addDays } from '@shopstock/shared/utils';
import { NotificationType, NotificationStatus, PaymentStatus } from '@shopstock/shared/constants';
import { emitNotificationCreated } from '../websocket';

// ============================================
// Job Types
// ============================================

interface JobContext {
  prisma: PrismaClient;
  io: Server | null;
}

// ============================================
// Low Stock Alert Job
// ============================================

async function checkLowStock(context: JobContext): Promise<void> {
  const { prisma, io } = context;

  try {
    const shops = await prisma.shop.findMany({
      select: { id: true, settings: true },
    });

    for (const shop of shops) {
      const threshold = shop.settings?.lowStockDefaultThreshold || 10;

      const lowStockProducts = await prisma.product.findMany({
        where: {
          shopId: shop.id,
          status: 'ACTIVE',
          currentStock: { lte: threshold, gt: 0 },
        },
        select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true },
      });

      for (const product of lowStockProducts) {
        // Check if notification already exists for this product
        const existing = await prisma.notification.findFirst({
          where: {
            shopId: shop.id,
            type: NotificationType.LOW_STOCK,
            entityId: product.id,
            status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
          },
        });

        if (!existing) {
          const notification = await prisma.notification.create({
            data: {
              shopId: shop.id,
              type: NotificationType.LOW_STOCK,
              entityId: product.id,
              entityType: 'Product',
              title: 'Low Stock Alert',
              message: `${product.name} (${product.sku}) is running low: ${product.currentStock} units remaining`,
              dueAt: new Date(),
              status: NotificationStatus.PENDING,
            },
          });

          if (io) {
            emitNotificationCreated(shop.id, notification);
          }
        }
      }
    }

    logger.info('Low stock check completed');
  } catch (error) {
    logger.error('Low stock check failed:', error);
  }
}

// ============================================
// Expiry Alert Job
// ============================================

async function checkExpiry(context: JobContext): Promise<void> {
  const { prisma, io } = context;

  try {
    const shops = await prisma.shop.findMany({
      select: { id: true, settings: true },
    });

    const now = new Date();

    for (const shop of shops) {
      const alertDays = shop.settings?.expiryAlertDays || [90, 30, 7, 1];

      // Check for expiring soon
      for (const days of alertDays) {
        const targetDate = addDays(now, days);

        const expiringBatches = await prisma.batch.findMany({
          where: {
            product: { shopId: shop.id },
            expiryDate: {
              gte: startOfDay(targetDate),
              lte: endOfDay(targetDate),
            },
            quantityAvailable: { gt: 0 },
            isExpired: false,
          },
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        });

        for (const batch of expiringBatches) {
          const existing = await prisma.notification.findFirst({
            where: {
              shopId: shop.id,
              type: NotificationType.EXPIRY_SOON,
              entityId: batch.id,
              status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
            },
          });

          if (!existing) {
            const notification = await prisma.notification.create({
              data: {
                shopId: shop.id,
                type: NotificationType.EXPIRY_SOON,
                entityId: batch.id,
                entityType: 'Batch',
                title: 'Expiry Alert',
                message: `${batch.product.name} (Batch: ${batch.batchNumber}) expires in ${days} days`,
                dueAt: batch.expiryDate || new Date(),
                status: NotificationStatus.PENDING,
              },
            });

            if (io) {
              emitNotificationCreated(shop.id, notification);
            }
          }
        }
      }

      // Check for expired
      const expiredBatches = await prisma.batch.findMany({
        where: {
          product: { shopId: shop.id },
          expiryDate: { lt: now },
          quantityAvailable: { gt: 0 },
          isExpired: false,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      });

      for (const batch of expiredBatches) {
        // Mark batch as expired
        await prisma.batch.update({
          where: { id: batch.id },
          data: { isExpired: true },
        });

        const existing = await prisma.notification.findFirst({
          where: {
            shopId: shop.id,
            type: NotificationType.EXPIRED,
            entityId: batch.id,
            status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
          },
        });

        if (!existing) {
          const notification = await prisma.notification.create({
            data: {
              shopId: shop.id,
              type: NotificationType.EXPIRED,
              entityId: batch.id,
              entityType: 'Batch',
              title: 'Expired Stock',
              message: `${batch.product.name} (Batch: ${batch.batchNumber}) has expired`,
              dueAt: batch.expiryDate || new Date(),
              status: NotificationStatus.PENDING,
            },
          });

          if (io) {
            emitNotificationCreated(shop.id, notification);
          }
        }
      }
    }

    logger.info('Expiry check completed');
  } catch (error) {
    logger.error('Expiry check failed:', error);
  }
}

// ============================================
// Overdue Payments Job
// ============================================

async function checkOverduePayments(context: JobContext): Promise<void> {
  const { prisma, io } = context;

  try {
    const shops = await prisma.shop.findMany({ select: { id: true } });

    for (const shop of shops) {
      // Check customer overdue invoices
      const overdueInvoices = await prisma.salesInvoice.findMany({
        where: {
          shopId: shop.id,
          dueDate: { lt: new Date() },
          paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] },
        },
        include: {
          customer: { select: { id: true, businessName: true } },
        },
      });

      for (const invoice of overdueInvoices) {
        const existing = await prisma.notification.findFirst({
          where: {
            shopId: shop.id,
            type: NotificationType.PAYMENT_OVERDUE,
            entityId: invoice.id,
            status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
          },
        });

        if (!existing) {
          const notification = await prisma.notification.create({
            data: {
              shopId: shop.id,
              type: NotificationType.PAYMENT_OVERDUE,
              entityId: invoice.id,
              entityType: 'SalesInvoice',
              title: 'Payment Overdue',
              message: `Invoice ${invoice.invoiceNumber} for ${invoice.customer?.businessName} is overdue (₹${formatCurrency(invoice.balanceDue)})`,
              dueAt: invoice.dueDate || new Date(),
              status: NotificationStatus.PENDING,
            },
          });

          if (io) {
            emitNotificationCreated(shop.id, notification);
          }
        }
      }
    }

    logger.info('Overdue payments check completed');
  } catch (error) {
    logger.error('Overdue payments check failed:', error);
  }
}

// ============================================
// Daily Summary Job
// ============================================

async function sendDailySummary(context: JobContext): Promise<void> {
  const { prisma, io } = context;

  try {
    const shops = await prisma.shop.findMany({ select: { id: true } });

    for (const shop of shops) {
      const users = await prisma.user.findMany({
        where: { shopId: shop.id, status: 'ACTIVE' },
        select: { id: true, role: true },
      });

      // Only send to owners and managers
      const recipientIds = users
        .filter(u => u.role === 'OWNER' || u.role === 'MANAGER')
        .map(u => u.id);

      if (recipientIds.length === 0) continue;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      const [sales, purchases, lowStock, expiring] = await Promise.all([
        prisma.salesInvoice.aggregate({
          where: { shopId: shop.id, invoiceDate: { gte: yesterday, lt: today } },
          _sum: { grandTotal: true },
          _count: true,
        }),
        prisma.purchase.aggregate({
          where: { shopId: shop.id, purchaseDate: { gte: yesterday, lt: today } },
          _sum: { grandTotal: true },
          _count: true,
        }),
        prisma.product.count({ where: { shopId: shop.id, status: 'ACTIVE', currentStock: { lte: prisma.product.fields.reorderLevel, gt: 0 } } }),
        prisma.batch.count({ where: { product: { shopId: shop.id }, expiryDate: { gte: new Date(), lte: addDays(new Date(), 30) }, quantityAvailable: { gt: 0 } } }),
      ]);

      for (const userId of recipientIds) {
        const notification = await prisma.notification.create({
          data: {
            shopId: shop.id,
            type: NotificationType.DAILY_SUMMARY,
            entityId: userId,
            entityType: 'User',
            title: 'Daily Summary',
            message: `Sales: ₹${formatCurrency(sales._sum.grandTotal || 0)} (${sales._count} invoices) | Purchases: ₹${formatCurrency(purchases._sum.grandTotal || 0)} | Low Stock: ${lowStock} | Expiring Soon: ${expiring}`,
            dueAt: new Date(),
            status: NotificationStatus.PENDING,
          },
        });

        if (io) {
          // Emit to specific user's socket
          io.to(`shop:${shop.id}`).emit('notificationCreated', notification);
        }
      }
    }

    logger.info('Daily summary sent');
  } catch (error) {
    logger.error('Daily summary failed:', error);
  }
}

// ============================================
// Cleanup Old Notifications Job
// ============================================

async function cleanupOldNotifications(context: JobContext): Promise<void> {
  const { prisma } = context;

  try {
    const thirtyDaysAgo = addDays(new Date(), -30);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: [NotificationStatus.READ, NotificationStatus.DISMISSED] },
      },
    });

    logger.info('Old notifications cleaned up', { count: result.count });
  } catch (error) {
    logger.error('Notification cleanup failed:', error);
  }
}

// ============================================
// Backup Job
// ============================================

async function runBackup(context: JobContext): Promise<void> {
  const { prisma } = context;

  if (!config.backup.enabled) return;

  try {
    logger.info('Starting backup...');

    // In production, this would:
    // 1. Export database to JSON/CSV
    // 2. Compress and encrypt
    // 3. Upload to cloud storage (S3, GCS, etc.)
    // 4. Clean up old backups based on retention policy

    // For now, just log
    logger.info('Backup completed (placeholder)');
  } catch (error) {
    logger.error('Backup failed:', error);
  }
}

// ============================================
// Setup All Jobs
// ============================================

export function setupCronJobs(prisma: PrismaClient, io: Server | null): void {
  const context: JobContext = { prisma, io };

  // Low stock check - every hour
  setInterval(() => checkLowStock(context), 60 * 60 * 1000);

  // Expiry check - every 6 hours
  setInterval(() => checkExpiry(context), 6 * 60 * 60 * 1000);

  // Overdue payments check - daily at 9 AM
  scheduleDaily(() => checkOverduePayments(context), 9, 0);

  // Daily summary - daily at 8 AM
  scheduleDaily(() => sendDailySummary(context), 8, 0);

  // Cleanup old notifications - daily at 2 AM
  scheduleDaily(() => cleanupOldNotifications(context), 2, 0);

  // Backup - daily at 2 AM (if enabled)
  if (config.backup.enabled) {
    scheduleDaily(() => runBackup(context), 2, 30);
  }

  // Run initial checks
  setTimeout(() => checkLowStock(context), 5000);
  setTimeout(() => checkExpiry(context), 10000);

  logger.info('Cron jobs scheduled');
}

// ============================================
// Helper Functions
// ============================================

function scheduleDaily(fn: () => Promise<void>, hour: number, minute: number): void {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, delay);
}

// Need to import these from shared utils
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}