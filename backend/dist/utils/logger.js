"use strict";
/**
 * Logger Utility
 * Winston-based structured logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
exports.logError = logError;
exports.logApiCall = logApiCall;
exports.logDbQuery = logDbQuery;
exports.logBusinessEvent = logBusinessEvent;
exports.createRequestLogger = createRequestLogger;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
// ============================================
// Log Format
// ============================================
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
}));
// ============================================
// Create Logger
// ============================================
const transports = [
    new winston_1.default.transports.Console({
        format: config_1.config.logging.prettyPrint ? consoleFormat : logFormat,
        level: config_1.config.logging.level,
    }),
];
// Add file transport in production
if (config_1.config.app.env === 'production') {
    transports.push(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
    }), new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
    }));
}
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logging.level,
    format: logFormat,
    defaultMeta: {
        service: config_1.config.app.name,
        version: config_1.config.app.version,
        environment: config_1.config.app.env,
    },
    transports,
    exitOnError: false,
});
// ============================================
// Helper Functions
// ============================================
function createChildLogger(meta) {
    return exports.logger.child(meta);
}
function logError(logger, error, context) {
    logger.error(error.message, {
        stack: error.stack,
        name: error.name,
        ...context,
    });
}
function logApiCall(logger, method, path, statusCode, durationMs, context) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'API call', {
        method,
        path,
        statusCode,
        durationMs,
        ...context,
    });
}
function logDbQuery(logger, query, durationMs, context) {
    logger.debug('Database query', {
        query: query.length > 500 ? query.substring(0, 500) + '...' : query,
        durationMs,
        ...context,
    });
}
function logBusinessEvent(logger, event, context) {
    logger.info(`Business event: ${event}`, context);
}
// ============================================
// Request-scoped Logger
// ============================================
function createRequestLogger(requestId, userId, shopId) {
    return exports.logger.child({
        requestId,
        userId,
        shopId,
    });
}
//# sourceMappingURL=logger.js.map