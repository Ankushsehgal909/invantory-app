/**
 * Stock Routes
 * Stock movements, adjustments, batch management
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError, BusinessLogicError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { createStockAdjustmentSchema } from '@shopstock/shared/validators';
import { MovementType, AdjustmentReason, ReferenceType } from '@shopstock/shared/constants';
import { logCreate, logUpdate } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';

const router = Router();

// ============================================
// List Stock Movements
// ============================================

router.get('/movements', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 50, productId, batchId, movementType, startDate, endDate, actorId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: any = { shopId };

  if (productId) where.productId = productId;
  if (batchId) where.batchId = batchId;
  if (movementType) where.movementType = movementType;
  if (actorId) where.actorId = actorId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        batch: { select: { id: true, batchNumber: true } },
        actor: { select: { id: true, name: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.json({
    success: true,
    data: { movements },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    },
  });
}));

// ============================================
// Get Stock Movement by ID
// ============================================

router.get('/movements/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const movement = await prisma.stockMovement.findFirst({
    where: { id, shopId },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      actor: { select: { id: true, name: true } },
    },
  });

  if (!movement) {
    throw new NotFoundError('Stock Movement');
  }

  res.json({ success: true, data: { movement } });
}));

// ============================================
// Create Stock Adjustment
// ============================================

router.post('/adjustments', requirePermission('CREATE_ADJUSTMENT'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const validation = createStockAdjustmentSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const { productId, batchId, movementType, quantityDelta, reason, notes } = validation.data;

  const product = await prisma.product.findFirst({
    where: { id: productId, shopId },
    include: { batches: { where: { id: batchId } } },
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  if (batchId && (!product.batches.length || product.batches[0].id !== batchId)) {
    throw new NotFoundError('Batch');
  }

  // Determine movement type from reason if not provided
  const finalMovementType = movementType || (quantityDelta > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT);

  // Get current quantities
  let qtyBefore: number;
  let batchQtyBefore: number | null = null;

  if (batchId) {
    const batch = product.batches[0];
    qtyBefore = batch.quantityAvailable;
    batchQtyBefore = qtyBefore;
  } else {
    qtyBefore = product.currentStock;
  }

  const qtyAfter = qtyBefore + quantityDelta;
  const batchQtyAfter = batchQtyBefore !== null ? batchQtyBefore + quantityDelta : null;

  // Check for negative stock
  if (qtyAfter < 0) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
    const allowNegative = shop?.settings?.allowNegativeStock || false;
    if (!allowNegative) {
      throw new BusinessLogicError('NEGATIVE_STOCK_NOT_ALLOWED', 'Insufficient stock for adjustment');
    }
  }

  if (batchQtyAfter !== null && batchQtyAfter < 0) {
    throw new BusinessLogicError('NEGATIVE_STOCK_NOT_ALLOWED', 'Insufficient batch stock for adjustment');
  }

  // Create adjustment in transaction
  const movement = await prisma.$transaction(async (tx) => {
    // Create stock movement
    const created = await tx.stockMovement.create({
      data: {
        shopId,
        productId,
        batchId,
        movementType: finalMovementType,
        quantityDelta,
        quantityBefore: qtyBefore,
        quantityAfter: qtyAfter,
        referenceType: ReferenceType.ADJUSTMENT,
        referenceId: '', // Will update after creation
        reason: notes || reason,
        actorId: userId,
        unitCost: batchId ? product.batches[0]?.unitCost : product.purchaseCost,
      },
    });

    // Update reference ID
    await tx.stockMovement.update({
      where: { id: created.id },
      data: { referenceId: created.id },
    });

    // Update product stock
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: qtyAfter },
    });

    // Update batch stock
    if (batchId) {
      await tx.batch.update({
        where: { id: batchId },
        data: { quantityAvailable: batchQtyAfter! },
      });
    }

    return created;
  });

  logCreate(req, 'StockAdjustment', movement.id, validation.data);

  res.status(201).json({
    success: true,
    data: {
      movement: {
        ...movement,
        unitCostFormatted: movement.unitCost ? formatCurrency(movement.unitCost) : null,
      },
    },
  });
}));

// ============================================
// Get Product Stock Summary
// ============================================

router.get('/summary/:productId', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { productId } = req.params;

  const product = await prisma.product.findFirst({
    where: { id: productId, shopId },
    include: {
      batches: {
        where: { quantityAvailable: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
      },
    },
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  // Get recent movements
  const recentMovements = await prisma.stockMovement.findMany({
    where: { shopId, productId },
    include: {
      batch: { select: { id: true, batchNumber: true } },
      actor: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json({
    success: true,
    data: {
      summary: {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        currentStock: product.currentStock,
        reorderLevel: product.reorderLevel,
        isLowStock: product.currentStock <= product.reorderLevel && product.currentStock > 0,
        isOutOfStock: product.currentStock <= 0,
        purchaseCost: product.purchaseCost,
        sellingPrice: product.sellingPrice,
        stockValueAtCost: product.currentStock * product.purchaseCost,
        stockValueAtSale: product.currentStock * product.sellingPrice,
        expiryMode: product.expiryMode,
        batches: product.batches.map(b => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantityAvailable: b.quantityAvailable,
          expiryDate: b.expiryDate,
          unitCost: b.unitCost,
          costValue: b.quantityAvailable * b.unitCost,
          isExpired: b.expiryDate ? new Date(b.expiryDate) < new Date() : false,
          daysToExpiry: b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        })),
        recentMovements: recentMovements.map(m => ({
          ...m,
          unitCostFormatted: m.unitCost ? formatCurrency(m.unitCost) : null,
        })),
      },
    },
  });
}));

// ============================================
// Get Low Stock Products
// ============================================

router.get('/low-stock', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 50 } = req.query;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        shopId,
        status: 'ACTIVE',
        currentStock: { lte: prisma.product.fields.reorderLevel, gt: 0 },
      },
      include: {
        category: { select: { id: true, name: true } },
        batches: { where: { quantityAvailable: { gt: 0 } }, take: 1, orderBy: { expiryDate: 'asc' } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { currentStock: 'asc' },
    }),
    prisma.product.count({
      where: {
        shopId,
        status: 'ACTIVE',
        currentStock: { lte: prisma.product.fields.reorderLevel, gt: 0 },
      },
    }),
  ]);

  res.json({
    success: true,
    data: { products },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    },
  });
}));

// ============================================
// Get Out of Stock Products
// ============================================

router.get('/out-of-stock', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 50 } = req.query;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        shopId,
        status: 'ACTIVE',
        currentStock: { lte: 0 },
      },
      include: {
        category: { select: { id: true, name: true } },
        batches: { where: { quantityAvailable: { gt: 0 } }, take: 1, orderBy: { expiryDate: 'asc' } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({
      where: {
        shopId,
        status: 'ACTIVE',
        currentStock: { lte: 0 },
      },
    }),
  ]);

  res.json({
    success: true,
    data: { products },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) < Math.ceil(total / Number(limit)),
      hasPrev: Number(page) > 1,
    },
  });
}));

// ============================================
// Movement Types Reference
// ============================================

router.get('/meta/movement-types', asyncHandler(async (req, res) => {
  const types = Object.values(MovementType).map(t => ({ value: t, label: t }));
  res.json({ success: true, data: { types } });
}));

// ============================================
// Adjustment Reasons Reference
// ============================================

router.get('/meta/adjustment-reasons', asyncHandler(async (req, res) => {
  const reasons = Object.values(AdjustmentReason).map(r => ({ value: r, label: r }));
  res.json({ success: true, data: { reasons } });
}));

export default router;