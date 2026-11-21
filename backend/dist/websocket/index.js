"use strict";
/**
 * WebSocket Server Setup
 * Real-time updates for stock, notifications, sync
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
exports.getIO = getIO;
exports.broadcastToShop = broadcastToShop;
exports.broadcastToChannel = broadcastToChannel;
exports.emitStockUpdated = emitStockUpdated;
exports.emitProductCreated = emitProductCreated;
exports.emitProductUpdated = emitProductUpdated;
exports.emitProductDeleted = emitProductDeleted;
exports.emitPurchaseCreated = emitPurchaseCreated;
exports.emitSaleCreated = emitSaleCreated;
exports.emitPaymentReceived = emitPaymentReceived;
exports.emitNotificationCreated = emitNotificationCreated;
exports.emitNotificationRead = emitNotificationRead;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// ============================================
// WebSocket Server
// ============================================
let io = null;
function setupWebSocket(httpServer, prisma) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_1.config.cors.origin,
            credentials: true,
        },
        pingInterval: config_1.config.websocket.pingInterval,
        pingTimeout: config_1.config.websocket.pingTimeout,
    });
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret, {
                issuer: config_1.config.jwt.issuer,
                audience: config_1.config.jwt.audience,
            });
            if (payload.type !== 'access') {
                return next(new Error('Invalid token type'));
            }
            // Verify user exists and is active
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, shopId: true, role: true, status: true },
            });
            if (!user || user.status !== 'ACTIVE') {
                return next(new Error('User not found or deactivated'));
            }
            socket.user = payload;
            socket.shopId = user.shopId;
            socket.data.channels = new Set();
            next();
        }
        catch (error) {
            next(new Error('Invalid token'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        logger_1.logger.info('WebSocket client connected', {
            socketId: socket.id,
            userId: socket.user?.userId,
            shopId: socket.shopId,
        });
        // Join shop room
        if (socket.shopId) {
            socket.join(`shop:${socket.shopId}`);
        }
        // Handle subscription to channels
        socket.on('subscribe', (channels) => {
            for (const channel of channels) {
                socket.join(`shop:${socket.shopId}:${channel}`);
                socket.data.channels.add(channel);
            }
            logger_1.logger.debug('Client subscribed to channels', { socketId: socket.id, channels });
        });
        socket.on('unsubscribe', (channels) => {
            for (const channel of channels) {
                socket.leave(`shop:${socket.shopId}:${channel}`);
                socket.data.channels.delete(channel);
            }
        });
        // Handle sync request
        socket.on('syncRequest', async (data) => {
            try {
                // This would trigger a sync process
                // For now, just acknowledge
                socket.emit('syncProgress', { processed: 0, total: 100 });
                // Simulate sync
                // In production, this would fetch changes since lastSyncAt
                setTimeout(() => {
                    socket.emit('syncComplete', { syncedCount: 0 });
                }, 1000);
            }
            catch (error) {
                socket.emit('syncError', { error: 'Sync failed' });
            }
        });
        // Handle disconnect
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('WebSocket client disconnected', {
                socketId: socket.id,
                userId: socket.user?.userId,
                reason,
            });
        });
        // Handle errors
        socket.on('error', (error) => {
            logger_1.logger.error('WebSocket error', { socketId: socket.id, error: error.message });
        });
    });
    // Periodic cleanup
    setInterval(() => {
        if (io) {
            // Clean up stale connections
            io.sockets.sockets.forEach((socket) => {
                if (socket.connected && socket.data.lastActivity) {
                    const inactiveTime = Date.now() - socket.data.lastActivity;
                    if (inactiveTime > 5 * 60 * 1000) { // 5 minutes
                        socket.disconnect(true);
                    }
                }
            });
        }
    }, 60000);
    logger_1.logger.info('WebSocket server initialized');
    return io;
}
function getIO() {
    return io;
}
// ============================================
// Broadcast Helpers
// ============================================
function broadcastToShop(shopId, event, data) {
    if (!io)
        return;
    io.to(`shop:${shopId}`).emit(event, data);
}
function broadcastToChannel(shopId, channel, event, data) {
    if (!io)
        return;
    io.to(`shop:${shopId}:${channel}`).emit(event, data);
}
// Specific event emitters
function emitStockUpdated(shopId, data) {
    broadcastToShop(shopId, 'stockUpdated', data);
    broadcastToChannel(shopId, 'stock', 'stockUpdated', data);
}
function emitProductCreated(shopId, product) {
    broadcastToShop(shopId, 'productCreated', product);
}
function emitProductUpdated(shopId, product) {
    broadcastToShop(shopId, 'productUpdated', product);
}
function emitProductDeleted(shopId, productId) {
    broadcastToShop(shopId, 'productDeleted', { productId });
}
function emitPurchaseCreated(shopId, purchase) {
    broadcastToShop(shopId, 'purchaseCreated', purchase);
    broadcastToChannel(shopId, 'purchases', 'purchaseCreated', purchase);
}
function emitSaleCreated(shopId, sale) {
    broadcastToShop(shopId, 'saleCreated', sale);
    broadcastToChannel(shopId, 'sales', 'saleCreated', sale);
}
function emitPaymentReceived(shopId, payment) {
    broadcastToShop(shopId, 'paymentReceived', payment);
    broadcastToChannel(shopId, 'payments', 'paymentReceived', payment);
}
function emitNotificationCreated(shopId, notification) {
    broadcastToShop(shopId, 'notificationCreated', notification);
    broadcastToChannel(shopId, 'notifications', 'notificationCreated', notification);
}
function emitNotificationRead(shopId, notificationId) {
    broadcastToShop(shopId, 'notificationRead', { notificationId });
}
//# sourceMappingURL=index.js.map