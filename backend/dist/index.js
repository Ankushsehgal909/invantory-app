"use strict";
/**
 * ShopStock Backend Entry Point
 * Express.js + MongoDB + Prisma + Socket.io
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = exports.prisma = void 0;
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const client_1 = require("@prisma/client");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const websocket_1 = require("./websocket");
const routes_1 = require("./routes");
const jobs_1 = require("./jobs");
const logger_1 = require("./utils/logger");
// ============================================
// Initialize Prisma Client
// ============================================
exports.prisma = new client_1.PrismaClient({
    log: config_1.config.app.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});
// ============================================
// Create Express App
// ============================================
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// ============================================
// Trust Proxy (for rate limiting behind proxy)
// ============================================
app.set('trust proxy', 1);
// ============================================
// Security Middleware
// ============================================
if (config_1.config.security.helmetEnabled) {
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: false, // Disable for API
    }));
}
// ============================================
// CORS
// ============================================
if (config_1.config.security.corsEnabled) {
    app.use((0, cors_1.default)({
        origin: config_1.config.cors.origin,
        credentials: config_1.config.cors.credentials,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    }));
}
// ============================================
// Body Parsing
// ============================================
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, compression_1.default)());
// ============================================
// Logging
// ============================================
if (config_1.config.app.env !== 'test') {
    app.use((0, morgan_1.default)(config_1.config.logging.prettyPrint ? 'dev' : 'combined', {
        stream: { write: (message) => logger_1.logger.info(message.trim()) },
    }));
}
app.use(requestLogger_1.requestLogger);
// ============================================
// Rate Limiting
// ============================================
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);
// Stricter rate limiting for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.authMaxRequests,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts, please try again later',
        },
    },
});
app.use('/api/v1/auth', authLimiter);
// ============================================
// Health Check
// ============================================
app.get('/health', async (req, res) => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: config_1.config.app.version,
                environment: config_1.config.app.env,
            },
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Database connection failed',
            },
        });
    }
});
app.get('/health/ready', async (req, res) => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        res.json({ success: true, data: { ready: true } });
    }
    catch {
        res.status(503).json({ success: false, data: { ready: false } });
    }
});
// ============================================
// API Routes
// ============================================
(0, routes_1.setupRoutes)(app);
// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
});
// ============================================
// Global Error Handler
// ============================================
app.use(errorHandler_1.errorHandler);
// ============================================
// WebSocket Setup
// ============================================
let io = null;
exports.io = io;
if (config_1.config.websocket.enabled) {
    exports.io = io = (0, websocket_1.setupWebSocket)(httpServer, exports.prisma);
    logger_1.logger.info('WebSocket server initialized');
}
// ============================================
// Cron Jobs Setup
// ============================================
if (config_1.config.app.env !== 'test') {
    (0, jobs_1.setupCronJobs)(exports.prisma, io);
    logger_1.logger.info('Cron jobs initialized');
}
// ============================================
// Graceful Shutdown
// ============================================
const shutdown = async (signal) => {
    logger_1.logger.info(`${signal} received, starting graceful shutdown...`);
    // Stop accepting new connections
    httpServer.close(async () => {
        logger_1.logger.info('HTTP server closed');
        // Close WebSocket connections
        if (io) {
            io.close();
            logger_1.logger.info('WebSocket server closed');
        }
        // Disconnect Prisma
        await exports.prisma.$disconnect();
        logger_1.logger.info('Prisma disconnected');
        process.exit(0);
    });
    // Force close after 30 seconds
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection:', reason);
    shutdown('UNHANDLED_REJECTION');
});
// ============================================
// Start Server
// ============================================
const startServer = async () => {
    try {
        // Validate configuration
        (0, config_1.validateConfig)();
        // Connect to database
        await exports.prisma.$connect();
        logger_1.logger.info('Database connected');
        // Start HTTP server
        httpServer.listen(config_1.config.app.port, () => {
            logger_1.logger.info(`🚀 Server running on port ${config_1.config.app.port}`);
            logger_1.logger.info(`📝 Environment: ${config_1.config.app.env}`);
            logger_1.logger.info(`🔗 API: http://localhost:${config_1.config.app.port}${config_1.config.app.apiPrefix}`);
            logger_1.logger.info(`💚 Health: http://localhost:${config_1.config.app.port}/health`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start if not in test mode
if (config_1.config.app.env !== 'test') {
    startServer();
}
//# sourceMappingURL=index.js.map