"use strict";
/**
 * Batch Routes
 * Batch management for expiry tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const requestLogger_1 = require("../middleware/requestLogger");
const utils_1 = require("@shopstock/shared/utils");
const router = (0, express_1.Router)();
// ============================================
// List Batches
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50, productId, expiryStatus, startDate, endDate } = req.query;
    const where = { product: { shopId } };
    if (productId)
        where.productId = productId;
    if (expiryStatus) {
        const now = new Date();
        switch (expiryStatus) {
            case 'expired':
                where.expiryDate = { lt: now };
                where.isExpired = true;
                break;
            case 'expiring_soon':
                where.expiryDate = { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) };
                where.isExpired = false;
                break;
            case 'no_expiry':
                where.expiryDate = null;
                break;
        }
    }
    if (startDate || endDate) {
        where.expiryDate = where.expiryDate || {};
        if (startDate)
            where.expiryDate.gte = new Date(startDate);
        if (endDate)
            where.expiryDate.lte = new Date(endDate);
    }
    const [batches, total] = await Promise.all([
        index_1.prisma.batch.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
                supplier: { select: { id: true, name: true } },
                purchase: { select: { id: true, invoiceNumber: true, purchaseDate: true } },
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { expiryDate: 'asc' },
        }),
        index_1.prisma.batch.count({ where }),
    ]);
    res.json({
        success: true,
        data: { batches: batches.map(b => ({
                ...b,
                unitCostFormatted: (0, utils_1.formatCurrency)(b.unitCost),
                costValue: b.quantityAvailable * b.unitCost,
                costValueFormatted: (0, utils_1.formatCurrency)(b.quantityAvailable * b.unitCost),
                isExpired: b.expiryDate ? new Date(b.expiryDate) < new Date() : false,
                daysToExpiry: b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
            })) },
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
}));
// ============================================
// Get Batch by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const batch = await index_1.prisma.batch.findFirst({
        where: { id, product: { shopId } },
        include: {
            product: { select: { id: true, name: true, sku: true, unit: true, expiryMode: true } },
            supplier: { select: { id: true, name: true, phone: true, email: true } },
            purchase: { select: { id: true, invoiceNumber: true, purchaseDate: true } },
            stockMovements: {
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: { actor: { select: { id: true, name: true } } },
            },
        },
    });
    if (!batch) {
        throw new errorHandler_1.NotFoundError('Batch');
    }
    res.json({
        success: true,
        data: {
            batch: {
                ...batch,
                unitCostFormatted: (0, utils_1.formatCurrency)(batch.unitCost),
                costValue: batch.quantityAvailable * batch.unitCost,
                costValueFormatted: (0, utils_1.formatCurrency)(batch.quantityAvailable * batch.unitCost),
                isExpired: batch.expiryDate ? new Date(batch.expiryDate) < new Date() : false,
                daysToExpiry: batch.expiryDate ? Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
            },
        },
    });
}));
// ============================================
// Create Batch (Manual)
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_STOCK'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { productId, batchNumber, purchaseDate, expiryDate, quantityReceived, unitCost, supplierId, purchaseId } = req.body;
    if (!productId || !batchNumber || !purchaseDate || quantityReceived === undefined || unitCost === undefined) {
        throw new errorHandler_1.ValidationError('Required fields: productId, batchNumber, purchaseDate, quantityReceived, unitCost');
    }
    const product = await index_1.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!product)
        throw new errorHandler_1.NotFoundError('Product');
    // Check batch number uniqueness
    const existing = await index_1.prisma.batch.findFirst({ where: { productId, batchNumber } });
    if (existing)
        throw new errorHandler_1.ValidationError('Batch number already exists for this product');
    const batch = await index_1.prisma.batch.create({
        data: {
            productId,
            shopId,
            batchNumber,
            purchaseDate: new Date(purchaseDate),
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            quantityReceived,
            quantityAvailable: quantityReceived,
            unitCost: (0, utils_1.toMinorUnits)(unitCost),
            supplierId,
            purchaseId,
        },
        include: { product: { select: { id: true, name: true, sku: true } } },
    });
    (0, requestLogger_1.logCreate)(req, 'Batch', batch.id, req.body);
    res.status(201).json({
        success: true,
        data: { batch: { ...batch, unitCostFormatted: (0, utils_1.formatCurrency)(batch.unitCost) } },
    });
}));
// ============================================
// Update Batch
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('MANAGE_STOCK'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const { batchNumber, expiryDate, quantityAvailable, unitCost, isExpired } = req.body;
    const batch = await index_1.prisma.batch.findFirst({ where: { id, product: { shopId } } });
    if (!batch)
        throw new errorHandler_1.NotFoundError('Batch');
    // Check batch number uniqueness
    if (batchNumber && batchNumber !== batch.batchNumber) {
        const existing = await index_1.prisma.batch.findFirst({ where: { productId: batch.productId, batchNumber, id: { not: id } } });
        if (existing)
            throw new errorHandler_1.ValidationError('Batch number already exists for this product');
    }
    const updatedBatch = await index_1.prisma.batch.update({
        where: { id },
        data: {
            ...(batchNumber && { batchNumber }),
            ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
            ...(quantityAvailable !== undefined && { quantityAvailable }),
            ...(unitCost !== undefined && { unitCost: (0, utils_1.toMinorUnits)(unitCost) }),
            ...(isExpired !== undefined && { isExpired }),
        },
    });
    (0, requestLogger_1.logUpdate)(req, 'Batch', id, {}, req.body);
    res.json({ success: true, data: { batch: { ...updatedBatch, unitCostFormatted: (0, utils_1.formatCurrency)(updatedBatch.unitCost) } } });
}));
// ============================================
// Delete Batch
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_STOCK'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const batch = await index_1.prisma.batch.findFirst({
        where: { id, product: { shopId } },
        include: { _count: { select: { salesInvoiceItems: true, stockMovements: true } } },
    });
    if (!batch)
        throw new errorHandler_1.NotFoundError('Batch');
    if (batch._count.salesInvoiceItems > 0 || batch._count.stockMovements > 0) {
        throw new errorHandler_1.ValidationError('Cannot delete batch with transaction history');
    }
    await index_1.prisma.batch.delete({ where: { id } });
    (0, requestLogger_1.logDelete)(req, 'Batch', id, {});
    res.json({ success: true, data: { message: 'Batch deleted successfully' } });
}));
// ============================================
// Write Off Expired Batch
// ============================================
router.post('/:id/write-off', (0, auth_1.requirePermission)('MANAGE_STOCK'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason, notes } = req.body;
    const batch = await index_1.prisma.batch.findFirst({
        where: { id, product: { shopId } },
        include: { product: { select: { currentStock: true } } },
    });
    if (!batch)
        throw new errorHandler_1.NotFoundError('Batch');
    if (batch.quantityAvailable <= 0) {
        throw new errorHandler_1.ValidationError('No stock available to write off');
    }
    const product = await index_1.prisma.product.findUnique({ where: { id: batch.productId }, select: { currentStock: true } });
    const qtyBefore = product?.currentStock || 0;
    const qtyAfter = qtyBefore - batch.quantityAvailable;
    await index_1.prisma.$transaction(async (tx) => {
        // Create stock movement
        await tx.stockMovement.create({
            data: {
                shopId,
                productId: batch.productId,
                batchId: batch.id,
                movementType: 'EXPIRY_WRITE_OFF',
                quantityDelta: -batch.quantityAvailable,
                quantityBefore: qtyBefore,
                quantityAfter: qtyAfter,
                referenceType: 'ADJUSTMENT',
                referenceId: batch.id,
                reason: reason || `Expired batch write-off: ${batch.batchNumber}`,
                actorId: userId,
                unitCost: batch.unitCost,
                notes,
            },
        });
        // Update product stock
        await tx.product.update({
            where: { id: batch.productId },
            data: { currentStock: qtyAfter },
        });
        // Mark batch as expired and zero quantity
        await tx.batch.update({
            where: { id },
            data: { quantityAvailable: 0, isExpired: true },
        });
    });
    (0, requestLogger_1.logAction)(req, 'WRITE_OFF', 'Batch', id, { reason });
    res.json({ success: true, data: { message: 'Batch written off successfully' } });
}));
exports.default = router;
//# sourceMappingURL=batch.js.map