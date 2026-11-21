/**
 * API Routes Setup
 * Centralized route registration
 */

import { Application } from 'express';
import { authMiddleware, optionalAuthMiddleware, requireRole, requirePermission } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

// ============================================
// Route Modules
// ============================================

import authRoutes from './auth';
import shopRoutes from './shop';
import userRoutes from './user';
import categoryRoutes from './category';
import productRoutes from './product';
import batchRoutes from './batch';
import supplierRoutes from './supplier';
import customerRoutes from './customer';
import purchaseRoutes from './purchase';
import salesRoutes from './sales';
import stockRoutes from './stock';
import paymentRoutes from './payment';
import reportRoutes from './report';
import notificationRoutes from './notification';
import settingsRoutes from './settings';
import importExportRoutes from './importExport';
import healthRoutes from './health';

// ============================================
// Setup Routes
// ============================================

export function setupRoutes(app: Application): void {
  const apiPrefix = '/api/v1';

  // Health check (no auth)
  app.use(`${apiPrefix}/health`, healthRoutes);

  // Auth routes (no auth required)
  app.use(`${apiPrefix}/auth`, authRoutes);

  // Protected routes - require authentication
  app.use(`${apiPrefix}/shop`, authMiddleware, shopRoutes);
  app.use(`${apiPrefix}/users`, authMiddleware, userRoutes);
  app.use(`${apiPrefix}/categories`, authMiddleware, categoryRoutes);
  app.use(`${apiPrefix}/products`, authMiddleware, productRoutes);
  app.use(`${apiPrefix}/batches`, authMiddleware, batchRoutes);
  app.use(`${apiPrefix}/suppliers`, authMiddleware, supplierRoutes);
  app.use(`${apiPrefix}/customers`, authMiddleware, customerRoutes);
  app.use(`${apiPrefix}/purchases`, authMiddleware, purchaseRoutes);
  app.use(`${apiPrefix}/sales`, authMiddleware, salesRoutes);
  app.use(`${apiPrefix}/stock`, authMiddleware, stockRoutes);
  app.use(`${apiPrefix}/payments`, authMiddleware, paymentRoutes);
  app.use(`${apiPrefix}/reports`, authMiddleware, reportRoutes);
  app.use(`${apiPrefix}/notifications`, authMiddleware, notificationRoutes);
  app.use(`${apiPrefix}/settings`, authMiddleware, settingsRoutes);
  app.use(`${apiPrefix}/import-export`, authMiddleware, importExportRoutes);
}

// ============================================
// Route Helper Functions
// ============================================

export function createRouter() {
  const express = require('express');
  return express.Router();
}

export function applyAuth(router: any, ...middlewares: any[]) {
  router.use(authMiddleware, ...middlewares);
}

export function applyOptionalAuth(router: any, ...middlewares: any[]) {
  router.use(optionalAuthMiddleware, ...middlewares);
}

export function applyRoleAuth(router: any, ...roles: any[]) {
  router.use(authMiddleware, requireRole(...roles));
}

export function applyPermissionAuth(router: any, permission: string) {
  router.use(authMiddleware, requirePermission(permission as any));
}