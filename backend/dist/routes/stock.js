"use strict";
/**
 * Stock Routes
 * Stock movements, adjustments, batch management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("@shopstock/shared/validators");
const constants_1 = require("@shopstock/shared/constants");
const requestLogger_1 = require("../middleware/requestLogger");
const utils_1 = require("@shopstock/shared/utils");
const router = (0, express_1.Router)();
// ============================================
// List Stock Movements
// ============================================
router.get('/movements', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50, productId, batchId, movementType, startDate, endDate, actorId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const where = { shopId };
    if (productId)
        where.productId = productId;
    if (batchId)
        where.batchId = batchId;
    if (movementType)
        where.movementType = movementType;
    if (actorId)
        where.actorId = actorId;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate)
            where.createdAt.gte = new Date(startDate);
        if (endDate)
            where.createdAt.lte = new Date(endDate);
    }
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    const [movements, total] = await Promise.all([
        index_1.prisma.stockMovement.findMany({
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
        index_1.prisma.stockMovement.count({ where }),
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
router.get('/movements/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const movement = await index_1.prisma.stockMovement.findFirst({
        where: { id, shopId },
        include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
            actor: { select: { id: true, name: true } },
        },
    });
    if (!movement) {
        throw new errorHandler_1.NotFoundError('Stock Movement');
    }
    res.json({ success: true, data: { movement } });
}));
// ============================================
// Create Stock Adjustment
// ============================================
router.post('/adjustments', (0, auth_1.requirePermission)('CREATE_ADJUSTMENT'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const validation = validators_1.createStockAdjustmentSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const { productId, batchId, movementType, quantityDelta, reason, notes } = validation.data;
    const product = await index_1.prisma.product.findFirst({
        where: { id: productId, shopId },
        include: { batches: { where: { id: batchId } } },
    });
    if (!product) {
        throw new errorHandler_1.NotFoundError('Product');
    }
    if (batchId && (!product.batches.length || product.batches[0].id !== batchId)) {
        throw new errorHandler_1.NotFoundError('Batch');
    }
    // Determine movement type from reason if not provided
    const finalMovementType = movementType || (quantityDelta > 0 ? constants_1.MovementType.ADJUSTMENT_IN : constants_1.MovementType.ADJUSTMENT_OUT);
    // Get current quantities
    let qtyBefore;
    let batchQtyBefore = null;
    if (batchId) {
        const batch = product.batches[0];
        qtyBefore = batch.quantityAvailable;
        batchQtyBefore = qtyBefore;
    }
    else {
        qtyBefore = product.currentStock;
    }
    const qtyAfter = qtyBefore + quantityDelta;
    const batchQtyAfter = batchQtyBefore !== null ? batchQtyBefore + quantityDelta : null;
    // Check for negative stock
    if (qtyAfter < 0) {
        const shop = await index_1.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
        const allowNegative = shop?.settings?.allowNegativeStock || false;
        if (!allowNegative) {
            throw new errorHandler_1.BusinessLogicError('NEGATIVE_STOCK_NOT_ALLOWED', 'Insufficient stock for adjustment');
        }
    }
    if (batchQtyAfter !== null && batchQtyAfter < 0) {
        throw new errorHandler_1.BusinessLogicError('NEGATIVE_STOCK_NOT_ALLOWED', 'Insufficient batch stock for adjustment');
    }
    // Create adjustment in transaction
    const movement = await index_1.prisma.$transaction(async (tx) => {
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
                referenceType: constants_1.ReferenceType.ADJUSTMENT,
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
                data: { quantityAvailable: batchQtyAfter },
            });
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'StockAdjustment', movement.id, validation.data);
    res.status(201).json({
        success: true,
        data: {
            movement: {
                ...movement,
                unitCostFormatted: movement.unitCost ? (0, utils_1.formatCurrency)(movement.unitCost) : null,
            },
        },
    });
}));
// ============================================
// Get Product Stock Summary
// ============================================
router.get('/summary/:productId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { productId } = req.params;
    const product = await index_1.prisma.product.findFirst({
        where: { id: productId, shopId },
        include: {
            batches: {
                where: { quantityAvailable: { gt: 0 } },
                orderBy: { expiryDate: 'asc' },
            },
        },
    });
    if (!product) {
        throw new errorHandler_1.NotFoundError('Product');
    }
    // Get recent movements
    const recentMovements = await index_1.prisma.stockMovement.findMany({
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
                    unitCostFormatted: m.unitCost ? (0, utils_1.formatCurrency)(m.unitCost) : null,
                })),
            },
        },
    });
}));
// ============================================
// Get Low Stock Products
// ============================================
router.get('/low-stock', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50 } = req.query;
    const [products, total] = await Promise.all([
        index_1.prisma.product.findMany({
            where: {
                shopId,
                status: 'ACTIVE',
                currentStock: { lte: index_1.prisma.product.fields.reorderLevel, gt: 0 },
            },
            include: {
                category: { select: { id: true, name: true } },
                batches: { where: { quantityAvailable: { gt: 0 } }, take: 1, orderBy: { expiryDate: 'asc' } },
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { currentStock: 'asc' },
        }),
        index_1.prisma.product.count({
            where: {
                shopId,
                status: 'ACTIVE',
                currentStock: { lte: index_1.prisma.product.fields.reorderLevel, gt: 0 },
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
router.get('/out-of-stock', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50 } = req.query;
    const [products, total] = await Promise.all([
        index_1.prisma.product.findMany({
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
        index_1.prisma.product.count({
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
router.get('/meta/movement-types', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const types = Object.values(constants_1.MovementType).map(t => ({ value: t, label: t }));
    res.json({ success: true, data: { types } });
}));
// ============================================
// Adjustment Reasons Reference
// ============================================
router.get('/meta/adjustment-reasons', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const reasons = Object.values(constants_1.AdjustmentReason).map(r => ({ value: r, label: r }));
    res.json({ success: true, data: { reasons } });
}));
exports.default = router;
//# sourceMappingURL=stock.js.map