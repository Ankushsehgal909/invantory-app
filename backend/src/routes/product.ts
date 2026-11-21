/**
 * Product Routes
 * Product CRUD, search, filters, bulk operations
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError, BusinessLogicError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import {
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
} from '@shopstock/shared/validators';
import { ProductStatus, UnitOfMeasure, ExpiryMode } from '@shopstock/shared/constants';
import { logCreate, logUpdate, logDelete, logAction } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';

const router = Router();

// ============================================
// List Products with Filters
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const validation = productFiltersSchema.safeParse(req.query);

  if (!validation.success) {
    throw new ValidationError('Invalid filters', { errors: validation.error.errors });
  }

  const { page, limit, search, categoryId, status, expiryMode, lowStock, outOfStock, archived, sortBy, sortOrder } = validation.data;

  const where: any = { shopId };

  if (archived !== true) {
    where.status = { not: ProductStatus.DELETED };
  }

  if (status) where.status = status;
  if (expiryMode) where.expiryMode = expiryMode;
  if (categoryId) where.categoryId = categoryId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (lowStock) {
    where.currentStock = { lte: prisma.product.fields.reorderLevel, gt: 0 };
  }

  if (outOfStock) {
    where.currentStock = { lte: 0 };
  }

  const orderBy: any = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder || 'asc';
  } else {
    orderBy.name = 'asc';
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { batches: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  // Compute additional fields
  const productsWithComputed = products.map(p => ({
    ...p,
    stockValueAtCost: p.currentStock * p.purchaseCost,
    stockValueAtSale: p.currentStock * p.sellingPrice,
    isLowStock: p.currentStock <= p.reorderLevel && p.currentStock > 0,
    isOutOfStock: p.currentStock <= 0,
    purchaseCostFormatted: formatCurrency(p.purchaseCost),
    sellingPriceFormatted: formatCurrency(p.sellingPrice),
  }));

  res.json({
    success: true,
    data: { products: productsWithComputed },
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  });
}));

// ============================================
// Get Product by ID
// ============================================

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const product = await prisma.product.findFirst({
    where: { id, shopId },
    include: {
      category: { select: { id: true, name: true } },
      batches: {
        where: { quantityAvailable: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
        include: {
          supplier: { select: { id: true, name: true } },
          purchase: { select: { id: true, invoiceNumber: true, purchaseDate: true } },
        },
      },
      _count: { select: { batches: true, purchaseItems: true, salesInvoiceItems: true } },
    },
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  // Get purchase history
  const purchaseHistory = await prisma.purchaseItem.findMany({
    where: { productId: id },
    include: {
      purchase: { select: { id: true, invoiceNumber: true, purchaseDate: true, supplier: { select: { name: true } } } },
    },
    orderBy: { purchase: { purchaseDate: 'desc' } },
    take: 20,
  });

  res.json({
    success: true,
    data: {
      product: {
        ...product,
        stockValueAtCost: product.currentStock * product.purchaseCost,
        stockValueAtSale: product.currentStock * product.sellingPrice,
        isLowStock: product.currentStock <= product.reorderLevel && product.currentStock > 0,
        isOutOfStock: product.currentStock <= 0,
        purchaseCostFormatted: formatCurrency(product.purchaseCost),
        sellingPriceFormatted: formatCurrency(product.sellingPrice),
        batches: product.batches.map(b => ({
          ...b,
          unitCostFormatted: formatCurrency(b.unitCost),
          costValue: b.quantityAvailable * b.unitCost,
          costValueFormatted: formatCurrency(b.quantityAvailable * b.unitCost),
          isExpired: b.expiryDate ? new Date(b.expiryDate) < new Date() : false,
          daysToExpiry: b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        })),
        purchaseHistory: purchaseHistory.map(pi => ({
          id: pi.purchase.id,
          invoiceNumber: pi.purchase.invoiceNumber,
          date: pi.purchase.purchaseDate,
          supplier: pi.purchase.supplier?.name,
          quantity: pi.quantity,
          unitCost: pi.unitCost,
          unitCostFormatted: formatCurrency(pi.unitCost),
          totalCost: pi.quantity * pi.unitCost,
          totalCostFormatted: formatCurrency(pi.quantity * pi.unitCost),
        })),
      },
    },
  });
}));

// ============================================
// Create Product
// ============================================

router.post('/', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const validation = createProductSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  // Check SKU uniqueness
  const existingSku = await prisma.product.findFirst({
    where: { shopId, sku: validation.data.sku },
  });

  if (existingSku) {
    throw new ValidationError('SKU already exists', { field: 'sku' });
  }

  // Check barcode uniqueness
  if (validation.data.barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { shopId, barcode: validation.data.barcode },
    });

    if (existingBarcode) {
      throw new ValidationError('Barcode already exists', { field: 'barcode' });
    }
  }

  // Convert currency to minor units
  const data = {
    ...validation.data,
    shopId,
    purchaseCost: toMinorUnits(validation.data.purchaseCost),
    sellingPrice: toMinorUnits(validation.data.sellingPrice),
    createdBy: userId,
    updatedBy: userId,
    currentStock: validation.data.openingStock,
  };

  // Use transaction for opening stock movement
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    // Create opening stock movement if opening stock > 0
    if (validation.data.openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          shopId,
          productId: created.id,
          movementType: 'OPENING_BALANCE',
          quantityDelta: validation.data.openingStock,
          quantityBefore: 0,
          quantityAfter: validation.data.openingStock,
          referenceType: 'OPENING_BALANCE',
          referenceId: created.id,
          reason: 'Opening stock',
          actorId: userId,
          unitCost: toMinorUnits(validation.data.purchaseCost),
        },
      });

      // Create ledger entry
      await tx.customerLedgerEntry.create({
        data: {
          shopId,
          customerId: created.id, // Using productId as customerId for stock ledger
          entryType: 'DEBIT',
          referenceType: 'OPENING_BALANCE',
          referenceId: created.id,
          debit: validation.data.openingStock * toMinorUnits(validation.data.purchaseCost),
          credit: 0,
          balanceAfter: validation.data.openingStock * toMinorUnits(validation.data.purchaseCost),
          description: `Opening stock: ${created.name}`,
        },
      });
    }

    return created;
  });

  logCreate(req, 'Product', product.id, validation.data);

  res.status(201).json({
    success: true,
    data: {
      product: {
        ...product,
        purchaseCostFormatted: formatCurrency(product.purchaseCost),
        sellingPriceFormatted: formatCurrency(product.sellingPrice),
      },
    },
  });
}));

// ============================================
// Update Product
// ============================================

router.put('/:id', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const validation = updateProductSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const product = await prisma.product.findFirst({
    where: { id, shopId },
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  // Check SKU uniqueness
  if (validation.data.sku && validation.data.sku !== product.sku) {
    const existingSku = await prisma.product.findFirst({
      where: { shopId, sku: validation.data.sku, id: { not: id } },
    });

    if (existingSku) {
      throw new ValidationError('SKU already exists', { field: 'sku' });
    }
  }

  // Check barcode uniqueness
  if (validation.data.barcode && validation.data.barcode !== product.barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { shopId, barcode: validation.data.barcode, id: { not: id } },
    });

    if (existingBarcode) {
      throw new ValidationError('Barcode already exists', { field: 'barcode' });
    }
  }

  // Prepare update data
  const updateData: any = { ...validation.data, updatedBy: userId };

  if (validation.data.purchaseCost !== undefined) {
    updateData.purchaseCost = toMinorUnits(validation.data.purchaseCost);
  }
  if (validation.data.sellingPrice !== undefined) {
    updateData.sellingPrice = toMinorUnits(validation.data.sellingPrice);
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: { select: { id: true, name: true } } },
  });

  logUpdate(req, 'Product', id, {}, validation.data);

  res.json({
    success: true,
    data: {
      product: {
        ...updatedProduct,
        purchaseCostFormatted: formatCurrency(updatedProduct.purchaseCost),
        sellingPriceFormatted: formatCurrency(updatedProduct.sellingPrice),
      },
    },
  });
}));

// ============================================
// Archive Product (Soft Delete)
// ============================================

router.delete('/:id', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const { force } = req.query;

  const product = await prisma.product.findFirst({
    where: { id, shopId },
    include: {
      _count: { select: { purchaseItems: true, salesInvoiceItems: true, stockMovements: true } },
    },
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  // Check if product has transaction history
  const hasHistory = product._count.purchaseItems > 0 || product._count.salesInvoiceItems > 0 || product._count.stockMovements > 0;

  if (hasHistory && force !== 'true') {
    throw new BusinessLogicError(
      'CANNOT_DELETE_WITH_HISTORY',
      'Product has transaction history. Use archive instead or force delete with ?force=true',
      { hasHistory, counts: product._count }
    );
  }

  if (force === 'true') {
    // Hard delete - only for products without history or with force
    await prisma.product.delete({ where: { id } });
    logDelete(req, 'Product', id, {});
    res.json({ success: true, data: { message: 'Product deleted permanently' } });
  } else {
    // Soft delete - archive
    await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
    logUpdate(req, 'Product', id, { status: product.status }, { status: ProductStatus.ARCHIVED });
    res.json({ success: true, data: { message: 'Product archived successfully' } });
  }
}));

// ============================================
// Restore Archived Product
// ============================================

router.post('/:id/restore', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const product = await prisma.product.findFirst({
    where: { id, shopId, status: ProductStatus.ARCHIVED },
  });

  if (!product) {
    throw new NotFoundError('Archived product');
  }

  await prisma.product.update({
    where: { id },
    data: { status: ProductStatus.ACTIVE },
  });

  logUpdate(req, 'Product', id, { status: ProductStatus.ARCHIVED }, { status: ProductStatus.ACTIVE });

  res.json({ success: true, data: { message: 'Product restored successfully' } });
}));

// ============================================
// Bulk Update Products
// ============================================

router.post('/bulk-update', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { ids, updates } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('Product IDs are required');
  }

  if (!updates || typeof updates !== 'object') {
    throw new ValidationError('Updates object is required');
  }

  // Validate allowed bulk update fields
  const allowedFields = ['categoryId', 'brand', 'reorderLevel', 'taxRate', 'status'];
  const invalidFields = Object.keys(updates).filter(key => !allowedFields.includes(key));

  if (invalidFields.length > 0) {
    throw new ValidationError(`Invalid bulk update fields: ${invalidFields.join(', ')}`);
  }

  // Convert currency fields
  const updateData: any = { ...updates, updatedBy: userId };
  if (updates.purchaseCost !== undefined) updateData.purchaseCost = toMinorUnits(updates.purchaseCost);
  if (updates.sellingPrice !== undefined) updateData.sellingPrice = toMinorUnits(updates.sellingPrice);

  const result = await prisma.product.updateMany({
    where: { id: { in: ids }, shopId },
    data: updateData,
  });

  logAction(req, 'BULK_UPDATE', 'Product', ids.join(','), { updates: updateData, count: result.count });

  res.json({ success: true, data: { updatedCount: result.count } });
}));

// ============================================
// Get Product Units
// ============================================

router.get('/meta/units', asyncHandler(async (req, res) => {
  const units = Object.values(UnitOfMeasure).map(u => ({ value: u, label: u }));
  res.json({ success: true, data: { units } });
}));

// ============================================
// Get Expiry Modes
// ============================================

router.get('/meta/expiry-modes', asyncHandler(async (req, res) => {
  const modes = Object.values(ExpiryMode).map(m => ({ value: m, label: m }));
  res.json({ success: true, data: { modes } });
}));

export default router;