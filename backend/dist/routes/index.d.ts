/**
 * API Routes Setup
 * Centralized route registration
 */
import { Application } from 'express';
export declare function setupRoutes(app: Application): void;
export declare function createRouter(): any;
export declare function applyAuth(router: any, ...middlewares: any[]): void;
export declare function applyOptionalAuth(router: any, ...middlewares: any[]): void;
export declare function applyRoleAuth(router: any, ...roles: any[]): void;
export declare function applyPermissionAuth(router: any, permission: string): void;
//# sourceMappingURL=index.d.ts.map