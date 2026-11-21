/**
 * WebSocket Server Setup
 * Real-time updates for stock, notifications, sync
 */
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
interface ServerToClientEvents {
    stockUpdated: (data: {
        productId: string;
        newStock: number;
        movement: any;
    }) => void;
    productCreated: (product: any) => void;
    productUpdated: (product: any) => void;
    productDeleted: (data: {
        productId: string;
    }) => void;
    purchaseCreated: (purchase: any) => void;
    purchaseUpdated: (purchase: any) => void;
    saleCreated: (sale: any) => void;
    saleUpdated: (sale: any) => void;
    paymentReceived: (payment: any) => void;
    notificationCreated: (notification: any) => void;
    notificationRead: (data: {
        notificationId: string;
    }) => void;
    syncProgress: (data: {
        processed: number;
        total: number;
    }) => void;
    syncComplete: (data: {
        syncedCount: number;
    }) => void;
    syncError: (data: {
        error: string;
    }) => void;
}
export declare function setupWebSocket(httpServer: HttpServer, prisma: PrismaClient): Server;
export declare function getIO(): Server | null;
export declare function broadcastToShop(shopId: string, event: keyof ServerToClientEvents, data: any): void;
export declare function broadcastToChannel(shopId: string, channel: string, event: keyof ServerToClientEvents, data: any): void;
export declare function emitStockUpdated(shopId: string, data: {
    productId: string;
    newStock: number;
    movement: any;
}): void;
export declare function emitProductCreated(shopId: string, product: any): void;
export declare function emitProductUpdated(shopId: string, product: any): void;
export declare function emitProductDeleted(shopId: string, productId: string): void;
export declare function emitPurchaseCreated(shopId: string, purchase: any): void;
export declare function emitSaleCreated(shopId: string, sale: any): void;
export declare function emitPaymentReceived(shopId: string, payment: any): void;
export declare function emitNotificationCreated(shopId: string, notification: any): void;
export declare function emitNotificationRead(shopId: string, notificationId: string): void;
export {};
//# sourceMappingURL=index.d.ts.map