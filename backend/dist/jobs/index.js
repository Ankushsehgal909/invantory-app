"use strict";
/**
 * Cron Jobs Setup
 * Scheduled tasks for notifications, cleanup, backups
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCronJobs = setupCronJobs;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const utils_1 = require("@shopstock/shared/utils");
const constants_1 = require("@shopstock/shared/constants");
const websocket_1 = require("../websocket");
// ============================================
// Low Stock Alert Job
// ============================================
async function checkLowStock(context) {
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
                        type: constants_1.NotificationType.LOW_STOCK,
                        entityId: product.id,
                        status: { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] },
                    },
                });
                if (!existing) {
                    const notification = await prisma.notification.create({
                        data: {
                            shopId: shop.id,
                            type: constants_1.NotificationType.LOW_STOCK,
                            entityId: product.id,
                            entityType: 'Product',
                            title: 'Low Stock Alert',
                            message: `${product.name} (${product.sku}) is running low: ${product.currentStock} units remaining`,
                            dueAt: new Date(),
                            status: constants_1.NotificationStatus.PENDING,
                        },
                    });
                    if (io) {
                        (0, websocket_1.emitNotificationCreated)(shop.id, notification);
                    }
                }
            }
        }
        logger_1.logger.info('Low stock check completed');
    }
    catch (error) {
        logger_1.logger.error('Low stock check failed:', error);
    }
}
// ============================================
// Expiry Alert Job
// ============================================
async function checkExpiry(context) {
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
                const targetDate = (0, utils_1.addDays)(now, days);
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
                            type: constants_1.NotificationType.EXPIRY_SOON,
                            entityId: batch.id,
                            status: { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] },
                        },
                    });
                    if (!existing) {
                        const notification = await prisma.notification.create({
                            data: {
                                shopId: shop.id,
                                type: constants_1.NotificationType.EXPIRY_SOON,
                                entityId: batch.id,
                                entityType: 'Batch',
                                title: 'Expiry Alert',
                                message: `${batch.product.name} (Batch: ${batch.batchNumber}) expires in ${days} days`,
                                dueAt: batch.expiryDate || new Date(),
                                status: constants_1.NotificationStatus.PENDING,
                            },
                        });
                        if (io) {
                            (0, websocket_1.emitNotificationCreated)(shop.id, notification);
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
                        type: constants_1.NotificationType.EXPIRED,
                        entityId: batch.id,
                        status: { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] },
                    },
                });
                if (!existing) {
                    const notification = await prisma.notification.create({
                        data: {
                            shopId: shop.id,
                            type: constants_1.NotificationType.EXPIRED,
                            entityId: batch.id,
                            entityType: 'Batch',
                            title: 'Expired Stock',
                            message: `${batch.product.name} (Batch: ${batch.batchNumber}) has expired`,
                            dueAt: batch.expiryDate || new Date(),
                            status: constants_1.NotificationStatus.PENDING,
                        },
                    });
                    if (io) {
                        (0, websocket_1.emitNotificationCreated)(shop.id, notification);
                    }
                }
            }
        }
        logger_1.logger.info('Expiry check completed');
    }
    catch (error) {
        logger_1.logger.error('Expiry check failed:', error);
    }
}
// ============================================
// Overdue Payments Job
// ============================================
async function checkOverduePayments(context) {
    const { prisma, io } = context;
    try {
        const shops = await prisma.shop.findMany({ select: { id: true } });
        for (const shop of shops) {
            // Check customer overdue invoices
            const overdueInvoices = await prisma.salesInvoice.findMany({
                where: {
                    shopId: shop.id,
                    dueDate: { lt: new Date() },
                    paymentStatus: { in: [constants_1.PaymentStatus.UNPAID, constants_1.PaymentStatus.PARTIALLY_PAID] },
                },
                include: {
                    customer: { select: { id: true, businessName: true } },
                },
            });
            for (const invoice of overdueInvoices) {
                const existing = await prisma.notification.findFirst({
                    where: {
                        shopId: shop.id,
                        type: constants_1.NotificationType.PAYMENT_OVERDUE,
                        entityId: invoice.id,
                        status: { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] },
                    },
                });
                if (!existing) {
                    const notification = await prisma.notification.create({
                        data: {
                            shopId: shop.id,
                            type: constants_1.NotificationType.PAYMENT_OVERDUE,
                            entityId: invoice.id,
                            entityType: 'SalesInvoice',
                            title: 'Payment Overdue',
                            message: `Invoice ${invoice.invoiceNumber} for ${invoice.customer?.businessName} is overdue (₹${(0, utils_1.formatCurrency)(invoice.balanceDue)})`,
                            dueAt: invoice.dueDate || new Date(),
                            status: constants_1.NotificationStatus.PENDING,
                        },
                    });
                    if (io) {
                        (0, websocket_1.emitNotificationCreated)(shop.id, notification);
                    }
                }
            }
        }
        logger_1.logger.info('Overdue payments check completed');
    }
    catch (error) {
        logger_1.logger.error('Overdue payments check failed:', error);
    }
}
// ============================================
// Daily Summary Job
// ============================================
async function sendDailySummary(context) {
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
            if (recipientIds.length === 0)
                continue;
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
                prisma.batch.count({ where: { product: { shopId: shop.id }, expiryDate: { gte: new Date(), lte: (0, utils_1.addDays)(new Date(), 30) }, quantityAvailable: { gt: 0 } } }),
            ]);
            for (const userId of recipientIds) {
                const notification = await prisma.notification.create({
                    data: {
                        shopId: shop.id,
                        type: constants_1.NotificationType.DAILY_SUMMARY,
                        entityId: userId,
                        entityType: 'User',
                        title: 'Daily Summary',
                        message: `Sales: ₹${(0, utils_1.formatCurrency)(sales._sum.grandTotal || 0)} (${sales._count} invoices) | Purchases: ₹${(0, utils_1.formatCurrency)(purchases._sum.grandTotal || 0)} | Low Stock: ${lowStock} | Expiring Soon: ${expiring}`,
                        dueAt: new Date(),
                        status: constants_1.NotificationStatus.PENDING,
                    },
                });
                if (io) {
                    // Emit to specific user's socket
                    io.to(`shop:${shop.id}`).emit('notificationCreated', notification);
                }
            }
        }
        logger_1.logger.info('Daily summary sent');
    }
    catch (error) {
        logger_1.logger.error('Daily summary failed:', error);
    }
}
// ============================================
// Cleanup Old Notifications Job
// ============================================
async function cleanupOldNotifications(context) {
    const { prisma } = context;
    try {
        const thirtyDaysAgo = (0, utils_1.addDays)(new Date(), -30);
        const result = await prisma.notification.deleteMany({
            where: {
                createdAt: { lt: thirtyDaysAgo },
                status: { in: [constants_1.NotificationStatus.READ, constants_1.NotificationStatus.DISMISSED] },
            },
        });
        logger_1.logger.info('Old notifications cleaned up', { count: result.count });
    }
    catch (error) {
        logger_1.logger.error('Notification cleanup failed:', error);
    }
}
// ============================================
// Backup Job
// ============================================
async function runBackup(context) {
    const { prisma } = context;
    if (!config_1.config.backup.enabled)
        return;
    try {
        logger_1.logger.info('Starting backup...');
        // In production, this would:
        // 1. Export database to JSON/CSV
        // 2. Compress and encrypt
        // 3. Upload to cloud storage (S3, GCS, etc.)
        // 4. Clean up old backups based on retention policy
        // For now, just log
        logger_1.logger.info('Backup completed (placeholder)');
    }
    catch (error) {
        logger_1.logger.error('Backup failed:', error);
    }
}
// ============================================
// Setup All Jobs
// ============================================
function setupCronJobs(prisma, io) {
    const context = { prisma, io };
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
    if (config_1.config.backup.enabled) {
        scheduleDaily(() => runBackup(context), 2, 30);
    }
    // Run initial checks
    setTimeout(() => checkLowStock(context), 5000);
    setTimeout(() => checkExpiry(context), 10000);
    logger_1.logger.info('Cron jobs scheduled');
}
// ============================================
// Helper Functions
// ============================================
function scheduleDaily(fn, hour, minute) {
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
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
//# sourceMappingURL=index.js.map