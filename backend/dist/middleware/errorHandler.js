"use strict";
/**
 * Global Error Handler Middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessLogicError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = require("jsonwebtoken");
const logger_1 = require("../utils/logger");
const constants_1 = require("@shopstock/shared/constants");
// ============================================
// Custom Error Classes
// ============================================
class AppError extends Error {
    code;
    statusCode;
    details;
    isOperational;
    constructor(code, message, statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, details) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(constants_1.ERROR_CODES.VALIDATION_ERROR, message, constants_1.HTTP_STATUS.BAD_REQUEST, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(constants_1.ERROR_CODES.UNAUTHORIZED, message, constants_1.HTTP_STATUS.UNAUTHORIZED);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(constants_1.ERROR_CODES.FORBIDDEN, message, constants_1.HTTP_STATUS.FORBIDDEN);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(constants_1.ERROR_CODES.NOT_FOUND, `${resource} not found`, constants_1.HTTP_STATUS.NOT_FOUND);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(constants_1.ERROR_CODES.CONFLICT, message, constants_1.HTTP_STATUS.CONFLICT);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class BusinessLogicError extends AppError {
    constructor(code, message, details) {
        super(code, message, constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY, details);
        this.name = 'BusinessLogicError';
    }
}
exports.BusinessLogicError = BusinessLogicError;
// ============================================
// Error Handler
// ============================================
function errorHandler(error, req, res, next) {
    // Log error
    logger_1.logger.error('Error occurred:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        shopId: req.user?.shopId,
    });
    // Handle known error types
    if (error instanceof AppError) {
        sendErrorResponse(res, error.statusCode, error.code, error.message, error.details);
        return;
    }
    // Handle Zod validation errors
    if (error instanceof zod_1.ZodError) {
        const details = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));
        sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { errors: details });
        return;
    }
    // Handle Prisma errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        handlePrismaError(error, res);
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Invalid database operation');
        return;
    }
    // Handle JWT errors
    if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
        sendErrorResponse(res, constants_1.HTTP_STATUS.UNAUTHORIZED, constants_1.ERROR_CODES.TOKEN_INVALID, 'Invalid token');
        return;
    }
    if (error instanceof jsonwebtoken_1.TokenExpiredError) {
        sendErrorResponse(res, constants_1.HTTP_STATUS.UNAUTHORIZED, constants_1.ERROR_CODES.TOKEN_EXPIRED, 'Token expired');
        return;
    }
    // Handle Multer errors (file upload)
    if (error.name === 'MulterError') {
        handleMulterError(error, res);
        return;
    }
    // Handle syntax errors (JSON parse)
    if (error instanceof SyntaxError && 'status' in error && error.status === 400 && 'body' in error) {
        sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.INVALID_INPUT, 'Invalid JSON payload');
        return;
    }
    // Unknown error - don't leak details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    sendErrorResponse(res, constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, constants_1.ERROR_CODES.INTERNAL_ERROR, isDevelopment ? error.message : 'An unexpected error occurred', isDevelopment ? { stack: error.stack } : undefined);
}
// ============================================
// Helper Functions
// ============================================
function sendErrorResponse(res, statusCode, code, message, details) {
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details,
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: res.requestId || 'unknown',
        },
    });
}
function handlePrismaError(error, res) {
    switch (error.code) {
        case 'P2002': {
            // Unique constraint violation
            const target = error.meta?.target || [];
            const field = target[0] || 'field';
            sendErrorResponse(res, constants_1.HTTP_STATUS.CONFLICT, constants_1.ERROR_CODES.DUPLICATE_ENTRY, `${field} already exists`, { field });
            break;
        }
        case 'P2025': {
            // Record not found
            sendErrorResponse(res, constants_1.HTTP_STATUS.NOT_FOUND, constants_1.ERROR_CODES.NOT_FOUND, 'Record not found');
            break;
        }
        case 'P2003': {
            // Foreign key constraint violation
            const field = error.meta?.field_name || 'field';
            sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.INVALID_INPUT, `Invalid reference: ${field}`, { field });
            break;
        }
        case 'P2014': {
            // Required relation violation
            sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Required relation is missing');
            break;
        }
        default: {
            sendErrorResponse(res, constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, constants_1.ERROR_CODES.DATABASE_ERROR, 'Database operation failed', process.env.NODE_ENV === 'development' ? { prismaCode: error.code } : undefined);
        }
    }
}
function handleMulterError(error, res) {
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.FILE_TOO_LARGE, 'File size exceeds limit');
            break;
        case 'LIMIT_FILE_COUNT':
            sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.INVALID_INPUT, 'Too many files');
            break;
        case 'LIMIT_UNEXPECTED_FILE':
            sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.INVALID_INPUT, 'Unexpected file field');
            break;
        default:
            sendErrorResponse(res, constants_1.HTTP_STATUS.BAD_REQUEST, constants_1.ERROR_CODES.INVALID_INPUT, error.message);
    }
}
// ============================================
// Async Handler Wrapper
// ============================================
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.js.map