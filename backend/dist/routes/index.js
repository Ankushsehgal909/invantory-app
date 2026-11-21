"use strict";
/**
 * API Routes Setup
 * Centralized route registration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
exports.createRouter = createRouter;
exports.applyAuth = applyAuth;
exports.applyOptionalAuth = applyOptionalAuth;
exports.applyRoleAuth = applyRoleAuth;
exports.applyPermissionAuth = applyPermissionAuth;
const auth_1 = require("../middleware/auth");
// ============================================
// Route Modules
// ============================================
const auth_2 = __importDefault(require("./auth"));
const shop_1 = __importDefault(require("./shop"));
const user_1 = __importDefault(require("./user"));
const category_1 = __importDefault(require("./category"));
const product_1 = __importDefault(require("./product"));
const batch_1 = __importDefault(require("./batch"));
const supplier_1 = __importDefault(require("./supplier"));
const customer_1 = __importDefault(require("./customer"));
const purchase_1 = __importDefault(require("./purchase"));
const sales_1 = __importDefault(require("./sales"));
const stock_1 = __importDefault(require("./stock"));
const payment_1 = __importDefault(require("./payment"));
const report_1 = __importDefault(require("./report"));
const notification_1 = __importDefault(require("./notification"));
const settings_1 = __importDefault(require("./settings"));
const importExport_1 = __importDefault(require("./importExport"));
const health_1 = __importDefault(require("./health"));
// ============================================
// Setup Routes
// ============================================
function setupRoutes(app) {
    const apiPrefix = '/api/v1';
    // Health check (no auth)
    app.use(`${apiPrefix}/health`, health_1.default);
    // Auth routes (no auth required)
    app.use(`${apiPrefix}/auth`, auth_2.default);
    // Protected routes - require authentication
    app.use(`${apiPrefix}/shop`, auth_1.authMiddleware, shop_1.default);
    app.use(`${apiPrefix}/users`, auth_1.authMiddleware, user_1.default);
    app.use(`${apiPrefix}/categories`, auth_1.authMiddleware, category_1.default);
    app.use(`${apiPrefix}/products`, auth_1.authMiddleware, product_1.default);
    app.use(`${apiPrefix}/batches`, auth_1.authMiddleware, batch_1.default);
    app.use(`${apiPrefix}/suppliers`, auth_1.authMiddleware, supplier_1.default);
    app.use(`${apiPrefix}/customers`, auth_1.authMiddleware, customer_1.default);
    app.use(`${apiPrefix}/purchases`, auth_1.authMiddleware, purchase_1.default);
    app.use(`${apiPrefix}/sales`, auth_1.authMiddleware, sales_1.default);
    app.use(`${apiPrefix}/stock`, auth_1.authMiddleware, stock_1.default);
    app.use(`${apiPrefix}/payments`, auth_1.authMiddleware, payment_1.default);
    app.use(`${apiPrefix}/reports`, auth_1.authMiddleware, report_1.default);
    app.use(`${apiPrefix}/notifications`, auth_1.authMiddleware, notification_1.default);
    app.use(`${apiPrefix}/settings`, auth_1.authMiddleware, settings_1.default);
    app.use(`${apiPrefix}/import-export`, auth_1.authMiddleware, importExport_1.default);
}
// ============================================
// Route Helper Functions
// ============================================
function createRouter() {
    const express = require('express');
    return express.Router();
}
function applyAuth(router, ...middlewares) {
    router.use(auth_1.authMiddleware, ...middlewares);
}
function applyOptionalAuth(router, ...middlewares) {
    router.use(auth_1.optionalAuthMiddleware, ...middlewares);
}
function applyRoleAuth(router, ...roles) {
    router.use(auth_1.authMiddleware, (0, auth_1.requireRole)(...roles));
}
function applyPermissionAuth(router, permission) {
    router.use(auth_1.authMiddleware, (0, auth_1.requirePermission)(permission));
}
//# sourceMappingURL=index.js.map