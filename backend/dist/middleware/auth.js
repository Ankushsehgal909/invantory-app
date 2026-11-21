"use strict";
/**
 * Authentication Middleware
 * JWT-based authentication with access/refresh token rotation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.requestIdMiddleware = exports.idempotencyMiddleware = exports.shopIsolationMiddleware = exports.optionalAuthMiddleware = exports.authMiddleware = exports.UserRole = void 0;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.decodeToken = decodeToken;
exports.requireRole = requireRole;
exports.requireOwnerOrManager = requireOwnerOrManager;
exports.requireOwner = requireOwner;
exports.hasPermission = hasPermission;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const config_1 = require("../config");
const errorHandler_1 = require("./errorHandler");
const constants_1 = require("@shopstock/shared/constants");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return constants_1.UserRole; } });
// ============================================
// Token Utilities
// ============================================
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'access' }, config_1.config.jwt.accessSecret, {
        expiresIn: config_1.config.jwt.accessExpiry,
        issuer: config_1.config.jwt.issuer,
        audience: config_1.config.jwt.audience,
    });
}
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, config_1.config.jwt.refreshSecret, {
        expiresIn: config_1.config.jwt.refreshExpiry,
        issuer: config_1.config.jwt.issuer,
        audience: config_1.config.jwt.audience,
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret, {
        issuer: config_1.config.jwt.issuer,
        audience: config_1.config.jwt.audience,
    });
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret, {
        issuer: config_1.config.jwt.issuer,
        audience: config_1.config.jwt.audience,
    });
}
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
// ============================================
// Authentication Middleware
// ============================================
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AuthenticationError('Missing or invalid authorization header');
        }
        const token = authHeader.slice(7); // Remove 'Bearer '
        // Verify token
        let payload;
        try {
            payload = verifyAccessToken(token);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errorHandler_1.AuthenticationError('Access token expired');
            }
            throw new errorHandler_1.AuthenticationError('Invalid access token');
        }
        // Check token type
        if (payload.type !== 'access') {
            throw new errorHandler_1.AuthenticationError('Invalid token type');
        }
        // Fetch user from database
        const user = await index_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                shopId: true,
                role: true,
                name: true,
                status: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AuthenticationError('User not found');
        }
        // Check user status
        if (user.status !== 'ACTIVE') {
            throw new errorHandler_1.AuthenticationError('Account is deactivated');
        }
        // Verify shop still exists
        const shop = await index_1.prisma.shop.findUnique({
            where: { id: payload.shopId },
            select: { id: true },
        });
        if (!shop) {
            throw new errorHandler_1.AuthenticationError('Shop not found');
        }
        // Attach user to request
        req.user = {
            id: user.id,
            shopId: user.shopId,
            role: user.role,
            name: user.name,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
// ============================================
// Optional Authentication Middleware
// ============================================
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.slice(7);
        const payload = verifyAccessToken(token);
        if (payload.type !== 'access') {
            return next();
        }
        const user = await index_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                shopId: true,
                role: true,
                name: true,
                status: true,
            },
        });
        if (user && user.status === 'ACTIVE') {
            req.user = {
                id: user.id,
                shopId: user.shopId,
                role: user.role,
                name: user.name,
            };
        }
        next();
    }
    catch {
        // Ignore errors for optional auth
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
// ============================================
// Role-based Authorization Middleware
// ============================================
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AuthenticationError());
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new errorHandler_1.AuthorizationError(`Required role: ${allowedRoles.join(' or ')}`));
        }
        next();
    };
}
function requireOwnerOrManager() {
    return requireRole(constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER);
}
function requireOwner() {
    return requireRole(constants_1.UserRole.OWNER);
}
// ============================================
// Shop Isolation Middleware
// ============================================
const shopIsolationMiddleware = (req, res, next) => {
    if (!req.user) {
        return next(new errorHandler_1.AuthenticationError());
    }
    // Ensure user can only access their shop's data
    // This is enforced at the query level, but we can add additional checks here
    // For example, if a shopId is provided in params/body, verify it matches user's shop
    const paramShopId = req.params.shopId || req.body.shopId || req.query.shopId;
    if (paramShopId && paramShopId !== req.user.shopId) {
        return next(new errorHandler_1.AuthorizationError('Access denied to this shop'));
    }
    next();
};
exports.shopIsolationMiddleware = shopIsolationMiddleware;
const idempotencyMiddleware = async (req, res, next) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (!idempotencyKey) {
        return next(); // Optional for now
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
        return next(new errorHandler_1.AppError(constants_1.ERROR_CODES.INVALID_INPUT, 'Invalid idempotency key format', 400));
    }
    // Check if key exists (using Redis or database)
    // For now, we'll store in memory - in production use Redis
    const existing = global.idempotencyKeys?.[idempotencyKey];
    if (existing) {
        // Return cached response
        res.status(existing.statusCode).json(existing.response);
        return;
    }
    // Store response for future requests
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (!global.idempotencyKeys)
            global.idempotencyKeys = {};
        global.idempotencyKeys[idempotencyKey] = {
            statusCode: res.statusCode,
            response: body,
            timestamp: Date.now(),
        };
        // Clean up old keys periodically
        if (Object.keys(global.idempotencyKeys).length > 10000) {
            const now = Date.now();
            Object.entries(global.idempotencyKeys).forEach(([key, value]) => {
                if (value && now - value.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
                    delete global.idempotencyKeys[key];
                }
            });
        }
        return originalJson(body);
    };
    next();
};
exports.idempotencyMiddleware = idempotencyMiddleware;
// ============================================
// Request ID Middleware
// ============================================
const requestIdMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
const PERMISSIONS_CONFIG = {
    // Shop management
    MANAGE_SHOP: [constants_1.UserRole.OWNER],
    MANAGE_USERS: [constants_1.UserRole.OWNER],
    MANAGE_SETTINGS: [constants_1.UserRole.OWNER],
    BACKUP_RESTORE: [constants_1.UserRole.OWNER],
    VIEW_AUDIT_LOG: [constants_1.UserRole.OWNER],
    // Product management
    MANAGE_PRODUCTS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    MANAGE_CATEGORIES: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    VIEW_PRODUCTS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.STAFF, constants_1.UserRole.VIEWER],
    // Supplier management
    MANAGE_SUPPLIERS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    // Customer management
    MANAGE_CUSTOMERS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    // Purchases
    CREATE_PURCHASE: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    EDIT_PURCHASE: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    DELETE_PURCHASE: [constants_1.UserRole.OWNER],
    VIEW_PURCHASES: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.STAFF, constants_1.UserRole.VIEWER],
    // Sales
    CREATE_SALE: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.STAFF],
    EDIT_SALE: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    DELETE_SALE: [constants_1.UserRole.OWNER],
    VIEW_SALES: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.STAFF, constants_1.UserRole.VIEWER],
    // Stock
    MANAGE_STOCK: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    CREATE_ADJUSTMENT: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.STAFF],
    // Reports
    VIEW_REPORTS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.VIEWER],
    EXPORT_DATA: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.VIEWER],
    // Payments
    MANAGE_PAYMENTS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
    VIEW_PAYMENTS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER, constants_1.UserRole.VIEWER],
    // Notifications
    MANAGE_NOTIFICATIONS: [constants_1.UserRole.OWNER, constants_1.UserRole.MANAGER],
};
exports.PERMISSIONS = PERMISSIONS_CONFIG;
function hasPermission(userRole, permission) {
    return exports.PERMISSIONS[permission].includes(userRole);
}
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AuthenticationError());
        }
        if (!hasPermission(req.user.role, permission)) {
            return next(new errorHandler_1.AuthorizationError(`Permission required: ${String(permission)}`));
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map