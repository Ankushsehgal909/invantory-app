/**
 * WebSocket Server Setup
 * Real-time updates for stock, notifications, sync
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth';

// ============================================
// Types
// ============================================

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
  shopId?: string;
}

interface ServerToClientEvents {
  stockUpdated: (data: { productId: string; newStock: number; movement: any }) => void;
  productCreated: (product: any) => void;
  productUpdated: (product: any) => void;
  productDeleted: (data: { productId: string }) => void;
  purchaseCreated: (purchase: any) => void;
  purchaseUpdated: (purchase: any) => void;
  saleCreated: (sale: any) => void;
  saleUpdated: (sale: any) => void;
  paymentReceived: (payment: any) => void;
  notificationCreated: (notification: any) => void;
  notificationRead: (data: { notificationId: string }) => void;
  syncProgress: (data: { processed: number; total: number }) => void;
  syncComplete: (data: { syncedCount: number }) => void;
  syncError: (data: { error: string }) => void;
}

interface ClientToServerEvents {
  authenticate: (token: string) => void;
  syncRequest: (data: { lastSyncAt: string }) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  user?: JwtPayload;
  shopId?: string;
  channels: Set<string>;
}

// ============================================
// WebSocket Server
// ============================================

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export function setupWebSocket(httpServer: HttpServer, prisma: PrismaClient): Server {
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingInterval: config.websocket.pingInterval,
    pingTimeout: config.websocket.pingTimeout,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, config.jwt.accessSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as JwtPayload;

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
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.user?.userId,
      shopId: socket.shopId,
    });

    // Join shop room
    if (socket.shopId) {
      socket.join(`shop:${socket.shopId}`);
    }

    // Handle subscription to channels
    socket.on('subscribe', (channels: string[]) => {
      for (const channel of channels) {
        socket.join(`shop:${socket.shopId}:${channel}`);
        socket.data.channels.add(channel);
      }
      logger.debug('Client subscribed to channels', { socketId: socket.id, channels });
    });

    socket.on('unsubscribe', (channels: string[]) => {
      for (const channel of channels) {
        socket.leave(`shop:${socket.shopId}:${channel}`);
        socket.data.channels.delete(channel);
      }
    });

    // Handle sync request
    socket.on('syncRequest', async (data: { lastSyncAt: string }) => {
      try {
        // This would trigger a sync process
        // For now, just acknowledge
        socket.emit('syncProgress', { processed: 0, total: 100 });

        // Simulate sync
        // In production, this would fetch changes since lastSyncAt
        setTimeout(() => {
          socket.emit('syncComplete', { syncedCount: 0 });
        }, 1000);
      } catch (error) {
        socket.emit('syncError', { error: 'Sync failed' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: socket.user?.userId,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error', { socketId: socket.id, error: error.message });
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

  logger.info('WebSocket server initialized');
  return io;
}

export function getIO(): Server | null {
  return io;
}

// ============================================
// Broadcast Helpers
// ============================================

export function broadcastToShop(shopId: string, event: keyof ServerToClientEvents, data: any): void {
  if (!io) return;
  io.to(`shop:${shopId}`).emit(event, data);
}

export function broadcastToChannel(shopId: string, channel: string, event: keyof ServerToClientEvents, data: any): void {
  if (!io) return;
  io.to(`shop:${shopId}:${channel}`).emit(event, data);
}

// Specific event emitters
export function emitStockUpdated(shopId: string, data: { productId: string; newStock: number; movement: any }): void {
  broadcastToShop(shopId, 'stockUpdated', data);
  broadcastToChannel(shopId, 'stock', 'stockUpdated', data);
}

export function emitProductCreated(shopId: string, product: any): void {
  broadcastToShop(shopId, 'productCreated', product);
}

export function emitProductUpdated(shopId: string, product: any): void {
  broadcastToShop(shopId, 'productUpdated', product);
}

export function emitProductDeleted(shopId: string, productId: string): void {
  broadcastToShop(shopId, 'productDeleted', { productId });
}

export function emitPurchaseCreated(shopId: string, purchase: any): void {
  broadcastToShop(shopId, 'purchaseCreated', purchase);
  broadcastToChannel(shopId, 'purchases', 'purchaseCreated', purchase);
}

export function emitSaleCreated(shopId: string, sale: any): void {
  broadcastToShop(shopId, 'saleCreated', sale);
  broadcastToChannel(shopId, 'sales', 'saleCreated', sale);
}

export function emitPaymentReceived(shopId: string, payment: any): void {
  broadcastToShop(shopId, 'paymentReceived', payment);
  broadcastToChannel(shopId, 'payments', 'paymentReceived', payment);
}

export function emitNotificationCreated(shopId: string, notification: any): void {
  broadcastToShop(shopId, 'notificationCreated', notification);
  broadcastToChannel(shopId, 'notifications', 'notificationCreated', notification);
}

export function emitNotificationRead(shopId: string, notificationId: string): void {
  broadcastToShop(shopId, 'notificationRead', { notificationId });
}