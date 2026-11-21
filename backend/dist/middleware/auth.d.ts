/**
 * Authentication Middleware
 * JWT-based authentication with access/refresh token rotation
 */
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shopstock/shared/constants';
export { UserRole };
export interface JwtPayload {
    userId: string;
    shopId: string;
    role: UserRole;
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        shopId: string;
        role: UserRole;
        name: string;
    };
    tokens?: {
        accessToken: string;
        refreshToken: string;
    };
}
export declare function generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
export declare function generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): JwtPayload;
export declare function decodeToken(token: string): JwtPayload | null;
export declare const authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuthMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare function requireRole(...allowedRoles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare function requireOwnerOrManager(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare function requireOwner(): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const shopIsolationMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
interface IdempotencyEntry {
    statusCode: number;
    response: any;
    timestamp: number;
}
declare global {
    var idempotencyKeys: Record<string, IdempotencyEntry>;
}
export declare const idempotencyMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requestIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
type PermissionKey = 'MANAGE_SHOP' | 'MANAGE_USERS' | 'MANAGE_SETTINGS' | 'BACKUP_RESTORE' | 'VIEW_AUDIT_LOG' | 'MANAGE_PRODUCTS' | 'MANAGE_CATEGORIES' | 'VIEW_PRODUCTS' | 'MANAGE_SUPPLIERS' | 'MANAGE_CUSTOMERS' | 'CREATE_PURCHASE' | 'EDIT_PURCHASE' | 'DELETE_PURCHASE' | 'VIEW_PURCHASES' | 'CREATE_SALE' | 'EDIT_SALE' | 'DELETE_SALE' | 'VIEW_SALES' | 'MANAGE_STOCK' | 'CREATE_ADJUSTMENT' | 'VIEW_REPORTS' | 'EXPORT_DATA' | 'MANAGE_PAYMENTS' | 'VIEW_PAYMENTS' | 'MANAGE_NOTIFICATIONS';
export declare const PERMISSIONS: Record<PermissionKey, UserRole[]>;
export declare function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean;
export declare function requirePermission(permission: keyof typeof PERMISSIONS): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map