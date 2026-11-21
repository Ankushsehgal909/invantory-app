/**
 * Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { ERROR_CODES, HTTP_STATUS } from '@shopstock/shared/constants';

// ============================================
// Custom Error Classes
// ============================================

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ERROR_CODES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(ERROR_CODES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, HTTP_STATUS.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.CONFLICT, message, HTTP_STATUS.CONFLICT);
    this.name = 'ConflictError';
  }
}

export class BusinessLogicError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, HTTP_STATUS.UNPROCESSABLE_ENTITY, details);
    this.name = 'BusinessLogicError';
  }
}

// ============================================
// Error Handler
// ============================================

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    shopId: (req as any).user?.shopId,
  });

  // Handle known error types
  if (error instanceof AppError) {
    sendErrorResponse(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', { errors: details });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, res);
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'Invalid database operation');
    return;
  }

  // Handle JWT errors
  if (error instanceof JsonWebTokenError) {
    sendErrorResponse(res, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID, 'Invalid token');
    return;
  }

  if (error instanceof TokenExpiredError) {
    sendErrorResponse(res, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED, 'Token expired');
    return;
  }

  // Handle Multer errors (file upload)
  if (error.name === 'MulterError') {
    handleMulterError(error, res);
    return;
  }

  // Handle syntax errors (JSON parse)
  if (error instanceof SyntaxError && 'status' in error && error.status === 400 && 'body' in error) {
    sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, 'Invalid JSON payload');
    return;
  }

  // Unknown error - don't leak details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  sendErrorResponse(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    isDevelopment ? error.message : 'An unexpected error occurred',
    isDevelopment ? { stack: error.stack } : undefined
  );
}

// ============================================
// Helper Functions
// ============================================

function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (res as any).requestId || 'unknown',
    },
  });
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[]) || [];
      const field = target[0] || 'field';
      sendErrorResponse(
        res,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.DUPLICATE_ENTRY,
        `${field} already exists`,
        { field }
      );
      break;
    }
    case 'P2025': {
      // Record not found
      sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        'Record not found'
      );
      break;
    }
    case 'P2003': {
      // Foreign key constraint violation
      const field = (error.meta?.field_name as string) || 'field';
      sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        `Invalid reference: ${field}`,
        { field }
      );
      break;
    }
    case 'P2014': {
      // Required relation violation
      sendErrorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        'Required relation is missing'
      );
      break;
    }
    default: {
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        process.env.NODE_ENV === 'development' ? { prismaCode: error.code } : undefined
      );
    }
  }
}

function handleMulterError(error: any, res: Response): void {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.FILE_TOO_LARGE, 'File size exceeds limit');
      break;
    case 'LIMIT_FILE_COUNT':
      sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, 'Too many files');
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, 'Unexpected file field');
      break;
    default:
      sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, error.message);
  }
}

// ============================================
// Async Handler Wrapper
// ============================================

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}