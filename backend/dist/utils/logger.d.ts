/**
 * Logger Utility
 * Winston-based structured logging
 */
import winston from 'winston';
export declare const logger: winston.Logger;
export declare function createChildLogger(meta: Record<string, unknown>): winston.Logger;
export declare function logError(logger: winston.Logger, error: Error, context?: Record<string, unknown>): void;
export declare function logApiCall(logger: winston.Logger, method: string, path: string, statusCode: number, durationMs: number, context?: Record<string, unknown>): void;
export declare function logDbQuery(logger: winston.Logger, query: string, durationMs: number, context?: Record<string, unknown>): void;
export declare function logBusinessEvent(logger: winston.Logger, event: string, context: Record<string, unknown>): void;
export declare function createRequestLogger(requestId: string, userId?: string, shopId?: string): winston.Logger;
//# sourceMappingURL=logger.d.ts.map