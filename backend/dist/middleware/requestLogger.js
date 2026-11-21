"use strict";
/**
 * Request Logger Middleware
 * Logs incoming requests with timing and context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
exports.createAuditLog = createAuditLog;
exports.logCreate = logCreate;
exports.logUpdate = logUpdate;
exports.logDelete = logDelete;
exports.logAction = logAction;
const logger_1 = require("../utils/logger");
// ============================================
// Request Logger
// ============================================
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = res.requestId || 'unknown';
    // Log request
    logger_1.logger.debug('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        shopId: req.user?.shopId,
    });
    // Capture response
    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - startTime;
        // Log response
        logger_1.logger.debug('Response sent', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: duration,
            contentLength: res.get('content-length'),
        });
        // Log slow requests
        if (duration > 1000) {
            logger_1.logger.warn('Slow request detected', {
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
exports.requestLogger = requestLogger;
async function createAuditLog(entry) {
    try {
        // Import prisma dynamically to avoid circular dependency
        const { prisma } = await import('../index.js');
        await prisma.auditLog.create({
            data: entry,
        });
    }
    catch (error) {
        // Don't throw - audit logging should not break the main operation
        logger_1.logger.error('Failed to create audit log:', error);
    }
}
// ============================================
// Audit Log Helpers
// ============================================
function logCreate(req, entityType, entityId, afterData) {
    if (!req.user)
        return;
    createAuditLog({
        actorId: req.user.id,
        shopId: req.user.shopId,
        action: 'CREATE',
        entityType,
        entityId,
        afterJson: afterData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    });
}
function logUpdate(req, entityType, entityId, beforeData, afterData) {
    if (!req.user)
        return;
    createAuditLog({
        actorId: req.user.id,
        shopId: req.user.shopId,
        action: 'UPDATE',
        entityType,
        entityId,
        beforeJson: beforeData,
        afterJson: afterData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    });
}
function logDelete(req, entityType, entityId, beforeData) {
    if (!req.user)
        return;
    createAuditLog({
        actorId: req.user.id,
        shopId: req.user.shopId,
        action: 'DELETE',
        entityType,
        entityId,
        beforeJson: beforeData,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    });
}
function logAction(req, action, entityType, entityId, data) {
    if (!req.user)
        return;
    createAuditLog({
        actorId: req.user.id,
        shopId: req.user.shopId,
        action,
        entityType,
        entityId,
        afterJson: data,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    });
}
//# sourceMappingURL=requestLogger.js.map