/**
 * Request Logger Middleware
 * Logs incoming requests with timing and context
 */
import { Request, Response, NextFunction } from 'express';
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export interface AuditLogEntry {
    actorId: string;
    shopId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: Record<string, unknown>;
    afterJson?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
export declare function createAuditLog(entry: AuditLogEntry): Promise<void>;
export declare function logCreate(req: Request, entityType: string, entityId: string, afterData: Record<string, unknown>): void;
export declare function logUpdate(req: Request, entityType: string, entityId: string, beforeData: Record<string, unknown>, afterData: Record<string, unknown>): void;
export declare function logDelete(req: Request, entityType: string, entityId: string, beforeData: Record<string, unknown>): void;
export declare function logAction(req: Request, action: string, entityType: string, entityId: string, data?: Record<string, unknown>): void;
//# sourceMappingURL=requestLogger.d.ts.map