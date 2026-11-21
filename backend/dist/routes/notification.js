"use strict";
/**
 * Notification Routes
 * In-app notifications management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const requestLogger_1 = require("../middleware/requestLogger");
const constants_1 = require("@shopstock/shared/constants");
const router = (0, express_1.Router)();
// ============================================
// List Notifications
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { page = 1, limit = 50, type, status, unreadOnly } = req.query;
    const where = { shopId };
    if (type)
        where.type = type;
    if (status)
        where.status = status;
    if (unreadOnly === 'true')
        where.status = { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] };
    // For staff, only show their notifications or global ones
    const userRole = req.user?.role;
    if (userRole === 'STAFF') {
        where.OR = [
            { entityType: 'User', entityId: userId },
            { entityType: { not: 'User' } }, // Global notifications
        ];
    }
    const [notifications, total, unreadCount] = await Promise.all([
        index_1.prisma.notification.findMany({
            where,
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        }),
        index_1.prisma.notification.count({ where }),
        index_1.prisma.notification.count({ where: { shopId, status: { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] } } }),
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
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const notification = await index_1.prisma.notification.findFirst({ where: { id, shopId } });
    if (!notification)
        throw new errorHandler_1.NotFoundError('Notification');
    res.json({ success: true, data: { notification } });
}));
// ============================================
// Mark Notification as Read
// ============================================
router.post('/:id/read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const notification = await index_1.prisma.notification.findFirst({ where: { id, shopId } });
    if (!notification)
        throw new errorHandler_1.NotFoundError('Notification');
    await index_1.prisma.notification.update({
        where: { id },
        data: { status: constants_1.NotificationStatus.READ, readAt: new Date() },
    });
    (0, requestLogger_1.logUpdate)(req, 'Notification', id, { status: notification.status }, { status: constants_1.NotificationStatus.READ });
    res.json({ success: true, data: { message: 'Notification marked as read' } });
}));
// ============================================
// Mark All as Read
// ============================================
router.post('/read-all', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const where = { shopId, status: { in: [constants_1.NotificationStatus.PENDING, constants_1.NotificationStatus.SENT] } };
    if (userRole === 'STAFF') {
        where.OR = [
            { entityType: 'User', entityId: userId },
            { entityType: { not: 'User' } },
        ];
    }
    await index_1.prisma.notification.updateMany({
        where,
        data: { status: constants_1.NotificationStatus.READ, readAt: new Date() },
    });
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
}));
// ============================================
// Dismiss Notification
// ============================================
router.post('/:id/dismiss', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const notification = await index_1.prisma.notification.findFirst({ where: { id, shopId } });
    if (!notification)
        throw new errorHandler_1.NotFoundError('Notification');
    await index_1.prisma.notification.update({
        where: { id },
        data: { status: constants_1.NotificationStatus.DISMISSED },
    });
    (0, requestLogger_1.logUpdate)(req, 'Notification', id, { status: notification.status }, { status: constants_1.NotificationStatus.DISMISSED });
    res.json({ success: true, data: { message: 'Notification dismissed' } });
}));
// ============================================
// Notification Types Reference
// ============================================
router.get('/meta/types', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const types = Object.values(constants_1.NotificationType).map(t => ({ value: t, label: t }));
    res.json({ success: true, data: { types } });
}));
// ============================================
// Notification Statuses Reference
// ============================================
router.get('/meta/statuses', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const statuses = Object.values(constants_1.NotificationStatus).map(s => ({ value: s, label: s }));
    res.json({ success: true, data: { statuses } });
}));
exports.default = router;
//# sourceMappingURL=notification.js.map