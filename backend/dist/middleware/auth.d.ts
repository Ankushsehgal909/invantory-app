/**
 * Authentication Middleware
 * JWT-based authentication with access/refresh token rotation
 */
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shopstock/shared/constants';
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
export declare const idempotencyMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requestIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const PERMISSIONS: {
    readonly MANAGE_SHOP: readonly [UserRole.OWNER];
    readonly MANAGE_USERS: readonly [UserRole.OWNER];
    readonly MANAGE_SETTINGS: readonly [UserRole.OWNER];
    readonly BACKUP_RESTORE: readonly [UserRole.OWNER];
    readonly VIEW_AUDIT_LOG: readonly [UserRole.OWNER];
    readonly MANAGE_PRODUCTS: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly MANAGE_CATEGORIES: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly VIEW_PRODUCTS: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER];
    readonly MANAGE_SUPPLIERS: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly MANAGE_CUSTOMERS: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly CREATE_PURCHASE: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly EDIT_PURCHASE: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly DELETE_PURCHASE: readonly [UserRole.OWNER];
    readonly VIEW_PURCHASES: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER];
    readonly CREATE_SALE: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
    readonly EDIT_SALE: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly DELETE_SALE: readonly [UserRole.OWNER];
    readonly VIEW_SALES: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF, UserRole.VIEWER];
    readonly MANAGE_STOCK: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly CREATE_ADJUSTMENT: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF];
    readonly VIEW_REPORTS: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.VIEWER];
    readonly EXPORT_DATA: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.VIEWER];
    readonly MANAGE_PAYMENTS: readonly [UserRole.OWNER, UserRole.MANAGER];
    readonly VIEW_PAYMENTS: readonly [UserRole.OWNER, UserRole.MANAGER, UserRole.VIEWER];
    readonly MANAGE_NOTIFICATIONS: readonly [UserRole.OWNER, UserRole.MANAGER];
};
export declare function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean;
export declare function requirePermission(permission: keyof typeof PERMISSIONS): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map