"use strict";
/**
 * Product Routes
 * Product CRUD, search, filters, bulk operations
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
// List Products with Filters
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const validation = validators_1.productFiltersSchema.safeParse(req.query);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid filters', { errors: validation.error.errors });
    }
    const { page, limit, search, categoryId, status, expiryMode, lowStock, outOfStock, archived, sortBy, sortOrder } = validation.data;
    const where = { shopId };
    if (archived !== true) {
        where.status = { not: constants_1.ProductStatus.DELETED };
    }
    if (status)
        where.status = status;
    if (expiryMode)
        where.expiryMode = expiryMode;
    if (categoryId)
        where.categoryId = categoryId;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search } },
            { brand: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (lowStock) {
        where.currentStock = { lte: index_1.prisma.product.fields.reorderLevel, gt: 0 };
    }
    if (outOfStock) {
        where.currentStock = { lte: 0 };
    }
    const orderBy = {};
    if (sortBy) {
        orderBy[sortBy] = sortOrder || 'asc';
    }
    else {
        orderBy.name = 'asc';
    }
    const [products, total] = await Promise.all([
        index_1.prisma.product.findMany({
            where,
            include: {
                category: { select: { id: true, name: true } },
                _count: { select: { batches: true } },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy,
        }),
        index_1.prisma.product.count({ where }),
    ]);
    // Compute additional fields
    const productsWithComputed = products.map(p => ({
        ...p,
        stockValueAtCost: p.currentStock * p.purchaseCost,
        stockValueAtSale: p.currentStock * p.sellingPrice,
        isLowStock: p.currentStock <= p.reorderLevel && p.currentStock > 0,
        isOutOfStock: p.currentStock <= 0,
        purchaseCostFormatted: (0, utils_1.formatCurrency)(p.purchaseCost),
        sellingPriceFormatted: (0, utils_1.formatCurrency)(p.sellingPrice),
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
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const product = await index_1.prisma.product.findFirst({
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
        throw new errorHandler_1.NotFoundError('Product');
    }
    // Get purchase history
    const purchaseHistory = await index_1.prisma.purchaseItem.findMany({
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
                purchaseCostFormatted: (0, utils_1.formatCurrency)(product.purchaseCost),
                sellingPriceFormatted: (0, utils_1.formatCurrency)(product.sellingPrice),
                batches: product.batches.map(b => ({
                    ...b,
                    unitCostFormatted: (0, utils_1.formatCurrency)(b.unitCost),
                    costValue: b.quantityAvailable * b.unitCost,
                    costValueFormatted: (0, utils_1.formatCurrency)(b.quantityAvailable * b.unitCost),
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
                    unitCostFormatted: (0, utils_1.formatCurrency)(pi.unitCost),
                    totalCost: pi.quantity * pi.unitCost,
                    totalCostFormatted: (0, utils_1.formatCurrency)(pi.quantity * pi.unitCost),
                })),
            },
        },
    });
}));
// ============================================
// Create Product
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const validation = validators_1.createProductSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    // Check SKU uniqueness
    const existingSku = await index_1.prisma.product.findFirst({
        where: { shopId, sku: validation.data.sku },
    });
    if (existingSku) {
        throw new errorHandler_1.ValidationError('SKU already exists', { field: 'sku' });
    }
    // Check barcode uniqueness
    if (validation.data.barcode) {
        const existingBarcode = await index_1.prisma.product.findFirst({
            where: { shopId, barcode: validation.data.barcode },
        });
        if (existingBarcode) {
            throw new errorHandler_1.ValidationError('Barcode already exists', { field: 'barcode' });
        }
    }
    // Convert currency to minor units
    const data = {
        ...validation.data,
        shopId,
        purchaseCost: (0, utils_1.toMinorUnits)(validation.data.purchaseCost),
        sellingPrice: (0, utils_1.toMinorUnits)(validation.data.sellingPrice),
        createdBy: userId,
        updatedBy: userId,
        currentStock: validation.data.openingStock,
    };
    // Use transaction for opening stock movement
    const product = await index_1.prisma.$transaction(async (tx) => {
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
                    unitCost: (0, utils_1.toMinorUnits)(validation.data.purchaseCost),
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
                    debit: validation.data.openingStock * (0, utils_1.toMinorUnits)(validation.data.purchaseCost),
                    credit: 0,
                    balanceAfter: validation.data.openingStock * (0, utils_1.toMinorUnits)(validation.data.purchaseCost),
                    description: `Opening stock: ${created.name}`,
                },
            });
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'Product', product.id, validation.data);
    res.status(201).json({
        success: true,
        data: {
            product: {
                ...product,
                purchaseCostFormatted: (0, utils_1.formatCurrency)(product.purchaseCost),
                sellingPriceFormatted: (0, utils_1.formatCurrency)(product.sellingPrice),
            },
        },
    });
}));
// ============================================
// Update Product
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const validation = validators_1.updateProductSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const product = await index_1.prisma.product.findFirst({
        where: { id, shopId },
    });
    if (!product) {
        throw new errorHandler_1.NotFoundError('Product');
    }
    // Check SKU uniqueness
    if (validation.data.sku && validation.data.sku !== product.sku) {
        const existingSku = await index_1.prisma.product.findFirst({
            where: { shopId, sku: validation.data.sku, id: { not: id } },
        });
        if (existingSku) {
            throw new errorHandler_1.ValidationError('SKU already exists', { field: 'sku' });
        }
    }
    // Check barcode uniqueness
    if (validation.data.barcode && validation.data.barcode !== product.barcode) {
        const existingBarcode = await index_1.prisma.product.findFirst({
            where: { shopId, barcode: validation.data.barcode, id: { not: id } },
        });
        if (existingBarcode) {
            throw new errorHandler_1.ValidationError('Barcode already exists', { field: 'barcode' });
        }
    }
    // Prepare update data
    const updateData = { ...validation.data, updatedBy: userId };
    if (validation.data.purchaseCost !== undefined) {
        updateData.purchaseCost = (0, utils_1.toMinorUnits)(validation.data.purchaseCost);
    }
    if (validation.data.sellingPrice !== undefined) {
        updateData.sellingPrice = (0, utils_1.toMinorUnits)(validation.data.sellingPrice);
    }
    const updatedProduct = await index_1.prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: { select: { id: true, name: true } } },
    });
    (0, requestLogger_1.logUpdate)(req, 'Product', id, {}, validation.data);
    res.json({
        success: true,
        data: {
            product: {
                ...updatedProduct,
                purchaseCostFormatted: (0, utils_1.formatCurrency)(updatedProduct.purchaseCost),
                sellingPriceFormatted: (0, utils_1.formatCurrency)(updatedProduct.sellingPrice),
            },
        },
    });
}));
// ============================================
// Archive Product (Soft Delete)
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const { force } = req.query;
    const product = await index_1.prisma.product.findFirst({
        where: { id, shopId },
        include: {
            _count: { select: { purchaseItems: true, salesInvoiceItems: true, stockMovements: true } },
        },
    });
    if (!product) {
        throw new errorHandler_1.NotFoundError('Product');
    }
    // Check if product has transaction history
    const hasHistory = product._count.purchaseItems > 0 || product._count.salesInvoiceItems > 0 || product._count.stockMovements > 0;
    if (hasHistory && force !== 'true') {
        throw new errorHandler_1.BusinessLogicError('CANNOT_DELETE_WITH_HISTORY', 'Product has transaction history. Use archive instead or force delete with ?force=true', { hasHistory, counts: product._count });
    }
    if (force === 'true') {
        // Hard delete - only for products without history or with force
        await index_1.prisma.product.delete({ where: { id } });
        (0, requestLogger_1.logDelete)(req, 'Product', id, {});
        res.json({ success: true, data: { message: 'Product deleted permanently' } });
    }
    else {
        // Soft delete - archive
        await index_1.prisma.product.update({
            where: { id },
            data: { status: constants_1.ProductStatus.ARCHIVED },
        });
        (0, requestLogger_1.logUpdate)(req, 'Product', id, { status: product.status }, { status: constants_1.ProductStatus.ARCHIVED });
        res.json({ success: true, data: { message: 'Product archived successfully' } });
    }
}));
// ============================================
// Restore Archived Product
// ============================================
router.post('/:id/restore', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const product = await index_1.prisma.product.findFirst({
        where: { id, shopId, status: constants_1.ProductStatus.ARCHIVED },
    });
    if (!product) {
        throw new errorHandler_1.NotFoundError('Archived product');
    }
    await index_1.prisma.product.update({
        where: { id },
        data: { status: constants_1.ProductStatus.ACTIVE },
    });
    (0, requestLogger_1.logUpdate)(req, 'Product', id, { status: constants_1.ProductStatus.ARCHIVED }, { status: constants_1.ProductStatus.ACTIVE });
    res.json({ success: true, data: { message: 'Product restored successfully' } });
}));
// ============================================
// Bulk Update Products
// ============================================
router.post('/bulk-update', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new errorHandler_1.ValidationError('Product IDs are required');
    }
    if (!updates || typeof updates !== 'object') {
        throw new errorHandler_1.ValidationError('Updates object is required');
    }
    // Validate allowed bulk update fields
    const allowedFields = ['categoryId', 'brand', 'reorderLevel', 'taxRate', 'status'];
    const invalidFields = Object.keys(updates).filter(key => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
        throw new errorHandler_1.ValidationError(`Invalid bulk update fields: ${invalidFields.join(', ')}`);
    }
    // Convert currency fields
    const updateData = { ...updates, updatedBy: userId };
    if (updates.purchaseCost !== undefined)
        updateData.purchaseCost = (0, utils_1.toMinorUnits)(updates.purchaseCost);
    if (updates.sellingPrice !== undefined)
        updateData.sellingPrice = (0, utils_1.toMinorUnits)(updates.sellingPrice);
    const result = await index_1.prisma.product.updateMany({
        where: { id: { in: ids }, shopId },
        data: updateData,
    });
    (0, requestLogger_1.logAction)(req, 'BULK_UPDATE', 'Product', ids.join(','), { updates: updateData, count: result.count });
    res.json({ success: true, data: { updatedCount: result.count } });
}));
// ============================================
// Get Product Units
// ============================================
router.get('/meta/units', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const units = Object.values(constants_1.UnitOfMeasure).map(u => ({ value: u, label: u }));
    res.json({ success: true, data: { units } });
}));
// ============================================
// Get Expiry Modes
// ============================================
router.get('/meta/expiry-modes', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const modes = Object.values(constants_1.ExpiryMode).map(m => ({ value: m, label: m }));
    res.json({ success: true, data: { modes } });
}));
exports.default = router;
//# sourceMappingURL=product.js.map