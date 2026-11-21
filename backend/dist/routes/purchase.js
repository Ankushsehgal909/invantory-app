"use strict";
/**
 * Purchase Routes
 * Purchase/refill management with stock updates
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
// List Purchases
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 20, search, supplierId, startDate, endDate, paymentStatus, sortBy = 'purchaseDate', sortOrder = 'desc' } = req.query;
    const where = { shopId };
    if (search) {
        where.OR = [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { supplierInvoiceNumber: { contains: search, mode: 'insensitive' } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }
    if (supplierId)
        where.supplierId = supplierId;
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
        where.purchaseDate = {};
        if (startDate)
            where.purchaseDate.gte = new Date(startDate);
        if (endDate)
            where.purchaseDate.lte = new Date(endDate);
    }
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    const [purchases, total] = await Promise.all([
        index_1.prisma.purchase.findMany({
            where,
            include: {
                supplier: { select: { id: true, name: true, phone: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                    },
                },
                _count: { select: { items: true } },
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy,
        }),
        index_1.prisma.purchase.count({ where }),
    ]);
    res.json({
        success: true,
        data: { purchases },
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
// Get Purchase by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const purchase = await index_1.prisma.purchase.findFirst({
        where: { id, shopId },
        include: {
            supplier: { select: { id: true, name: true, phone: true, email: true, address: true } },
            items: {
                include: {
                    product: { select: { id: true, name: true, sku: true, unit: true, purchaseCost: true, sellingPrice: true } },
                },
            },
            payments: {
                orderBy: { paidAt: 'desc' },
                select: { id: true, amount: true, method: true, paidAt: true, referenceNumber: true, notes: true },
            },
        },
    });
    if (!purchase) {
        throw new errorHandler_1.NotFoundError('Purchase');
    }
    res.json({
        success: true,
        data: {
            purchase: {
                ...purchase,
                subtotalFormatted: (0, utils_1.formatCurrency)(purchase.subtotal),
                discountFormatted: (0, utils_1.formatCurrency)(purchase.discount),
                taxFormatted: (0, utils_1.formatCurrency)(purchase.tax),
                additionalChargesFormatted: (0, utils_1.formatCurrency)(purchase.additionalCharges),
                grandTotalFormatted: (0, utils_1.formatCurrency)(purchase.grandTotal),
                amountPaidFormatted: (0, utils_1.formatCurrency)(purchase.amountPaid),
                balanceDueFormatted: (0, utils_1.formatCurrency)(purchase.balanceDue),
                items: purchase.items.map(item => ({
                    ...item,
                    unitCostFormatted: (0, utils_1.formatCurrency)(item.unitCost),
                    discountFormatted: (0, utils_1.formatCurrency)(item.discount),
                    taxFormatted: (0, utils_1.formatCurrency)(item.tax),
                    lineTotalFormatted: (0, utils_1.formatCurrency)(item.lineTotal),
                })),
                payments: purchase.payments.map(p => ({
                    ...p,
                    amountFormatted: (0, utils_1.formatCurrency)(p.amount),
                })),
            },
        },
    });
}));
// ============================================
// Create Purchase
// ============================================
router.post('/', (0, auth_1.requirePermission)('CREATE_PURCHASE'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const validation = validators_1.createPurchaseSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const { items, ...purchaseData } = validation.data;
    // Generate invoice number
    const lastPurchase = await index_1.prisma.purchase.findFirst({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
    });
    const sequence = lastPurchase
        ? parseInt(lastPurchase.invoiceNumber.replace(/\D/g, '')) + 1
        : 1;
    const shop = await index_1.prisma.shop.findUnique({ where: { id: shopId }, select: { purchasePrefix: true } });
    const invoiceNumber = (0, utils_1.generateInvoiceNumber)(shop?.purchasePrefix || 'PUR-', sequence);
    // Validate items and calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    for (const item of items) {
        const lineSubtotal = item.quantity * item.unitCost;
        subtotal += lineSubtotal;
        totalDiscount += item.discount || 0;
        totalTax += item.tax || 0;
    }
    const additionalCharges = purchaseData.additionalCharges || 0;
    const grandTotal = subtotal - totalDiscount + totalTax + additionalCharges;
    const amountPaid = purchaseData.amountPaid || 0;
    const balanceDue = grandTotal - amountPaid;
    let paymentStatus = constants_1.PaymentStatus.UNPAID;
    if (amountPaid >= grandTotal)
        paymentStatus = constants_1.PaymentStatus.PAID;
    else if (amountPaid > 0)
        paymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
    // Create purchase with items in transaction
    const purchase = await index_1.prisma.$transaction(async (tx) => {
        // Create purchase
        const created = await tx.purchase.create({
            data: {
                ...purchaseData,
                shopId,
                invoiceNumber,
                subtotal,
                discount: totalDiscount,
                tax: totalTax,
                additionalCharges,
                grandTotal,
                amountPaid,
                balanceDue,
                paymentStatus,
                createdBy: userId,
                items: {
                    create: items.map(item => ({
                        ...item,
                        unitCost: (0, utils_1.toMinorUnits)(item.unitCost),
                        discount: (0, utils_1.toMinorUnits)(item.discount || 0),
                        tax: (0, utils_1.toMinorUnits)(item.tax || 0),
                        lineTotal: (0, utils_1.toMinorUnits)(item.quantity * item.unitCost - (item.discount || 0) + (item.tax || 0)),
                    })),
                },
            },
            include: { items: true },
        });
        // Process each item: update stock, create batches, create movements
        for (const item of created.items) {
            const inputItem = items.find(i => i.productId === item.productId);
            if (!inputItem)
                continue;
            // Get or create batch
            let batchId = null;
            if (inputItem.batchNumber) {
                const existingBatch = await tx.batch.findFirst({
                    where: { productId: item.productId, batchNumber: inputItem.batchNumber },
                });
                if (existingBatch) {
                    batchId = existingBatch.id;
                    // Update batch quantity
                    await tx.batch.update({
                        where: { id: batchId },
                        data: {
                            quantityAvailable: { increment: inputItem.quantity },
                            quantityReceived: { increment: inputItem.quantity },
                        },
                    });
                }
                else {
                    // Create new batch
                    const batch = await tx.batch.create({
                        data: {
                            productId: item.productId,
                            shopId,
                            batchNumber: inputItem.batchNumber,
                            purchaseDate: new Date(purchaseData.purchaseDate),
                            expiryDate: inputItem.expiryDate ? new Date(inputItem.expiryDate) : null,
                            quantityReceived: inputItem.quantity,
                            quantityAvailable: inputItem.quantity,
                            unitCost: (0, utils_1.toMinorUnits)(inputItem.unitCost),
                            supplierId: purchaseData.supplierId,
                            purchaseId: created.id,
                        },
                    });
                    batchId = batch.id;
                }
            }
            // Update item with batch ID
            await tx.purchaseItem.update({
                where: { id: item.id },
                data: { batchId },
            });
            // Create stock movement
            const product = await tx.product.findUnique({ where: { id: item.productId }, select: { currentStock: true } });
            const qtyBefore = product?.currentStock || 0;
            const qtyAfter = qtyBefore + inputItem.quantity;
            await tx.stockMovement.create({
                data: {
                    shopId,
                    productId: item.productId,
                    batchId,
                    movementType: constants_1.MovementType.PURCHASE,
                    quantityDelta: inputItem.quantity,
                    quantityBefore: qtyBefore,
                    quantityAfter: qtyAfter,
                    referenceType: constants_1.ReferenceType.PURCHASE,
                    referenceId: created.id,
                    reason: `Purchase ${created.invoiceNumber}`,
                    actorId: userId,
                    unitCost: (0, utils_1.toMinorUnits)(inputItem.unitCost),
                },
            });
            // Update product current stock
            await tx.product.update({
                where: { id: item.productId },
                data: { currentStock: qtyAfter },
            });
        }
        // Handle supplier payment and ledger
        if (purchaseData.supplierId) {
            // Create payment record if amount paid > 0
            if (amountPaid > 0 && purchaseData.paymentMethod) {
                await tx.payment.create({
                    data: {
                        shopId,
                        partyType: constants_1.PartyType.SUPPLIER,
                        partyId: purchaseData.supplierId,
                        referenceType: constants_1.ReferenceType.PURCHASE,
                        referenceId: created.id,
                        amount: (0, utils_1.toMinorUnits)(amountPaid),
                        method: purchaseData.paymentMethod,
                        paidAt: new Date(purchaseData.purchaseDate),
                        createdBy: userId,
                    },
                });
            }
            // Update supplier balance
            await tx.supplier.update({
                where: { id: purchaseData.supplierId },
                data: { currentBalance: { increment: (0, utils_1.toMinorUnits)(balanceDue) } },
            });
            // Create supplier ledger entry
            await tx.supplierLedgerEntry.create({
                data: {
                    shopId,
                    supplierId: purchaseData.supplierId,
                    entryType: constants_1.LedgerEntryType.CREDIT, // We owe the supplier
                    referenceType: constants_1.ReferenceType.PURCHASE,
                    referenceId: created.id,
                    debit: 0,
                    credit: (0, utils_1.toMinorUnits)(grandTotal),
                    balanceAfter: (0, utils_1.toMinorUnits)(grandTotal), // This would need to be calculated properly
                    description: `Purchase ${invoiceNumber}`,
                },
            });
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'Purchase', purchase.id, validation.data);
    res.status(201).json({
        success: true,
        data: {
            purchase: {
                ...purchase,
                subtotalFormatted: (0, utils_1.formatCurrency)(purchase.subtotal),
                discountFormatted: (0, utils_1.formatCurrency)(purchase.discount),
                taxFormatted: (0, utils_1.formatCurrency)(purchase.tax),
                additionalChargesFormatted: (0, utils_1.formatCurrency)(purchase.additionalCharges),
                grandTotalFormatted: (0, utils_1.formatCurrency)(purchase.grandTotal),
                amountPaidFormatted: (0, utils_1.formatCurrency)(purchase.amountPaid),
                balanceDueFormatted: (0, utils_1.formatCurrency)(purchase.balanceDue),
            },
        },
    });
}));
// ============================================
// Update Purchase
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('EDIT_PURCHASE'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const purchase = await index_1.prisma.purchase.findFirst({
        where: { id, shopId },
    });
    if (!purchase) {
        throw new errorHandler_1.NotFoundError('Purchase');
    }
    if (purchase.status === constants_1.InvoiceStatus.CANCELLED) {
        throw new errorHandler_1.BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Cannot edit cancelled purchase');
    }
    // For now, only allow updating notes, payment status, etc.
    // Full item editing would require complex stock reversal
    const { notes, paymentStatus, amountPaid, paymentMethod } = req.body;
    const updateData = {};
    if (notes !== undefined)
        updateData.notes = notes;
    if (paymentStatus)
        updateData.paymentStatus = paymentStatus;
    if (amountPaid !== undefined && amountPaid !== purchase.amountPaid) {
        const newAmountPaid = (0, utils_1.toMinorUnits)(amountPaid);
        const diff = newAmountPaid - purchase.amountPaid;
        updateData.amountPaid = newAmountPaid;
        updateData.balanceDue = purchase.grandTotal - newAmountPaid;
        if (newAmountPaid >= purchase.grandTotal)
            updateData.paymentStatus = constants_1.PaymentStatus.PAID;
        else if (newAmountPaid > 0)
            updateData.paymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
        else
            updateData.paymentStatus = constants_1.PaymentStatus.UNPAID;
        // Create payment record for additional payment
        if (diff > 0 && paymentMethod) {
            await index_1.prisma.payment.create({
                data: {
                    shopId,
                    partyType: constants_1.PartyType.SUPPLIER,
                    partyId: purchase.supplierId,
                    referenceType: constants_1.ReferenceType.PURCHASE,
                    referenceId: id,
                    amount: diff,
                    method: paymentMethod,
                    paidAt: new Date(),
                    createdBy: req.user?.id,
                },
            });
        }
    }
    const updatedPurchase = await index_1.prisma.purchase.update({
        where: { id },
        data: updateData,
    });
    (0, requestLogger_1.logUpdate)(req, 'Purchase', id, {}, updateData);
    res.json({
        success: true,
        data: { purchase: updatedPurchase },
    });
}));
// ============================================
// Cancel Purchase
// ============================================
router.post('/:id/cancel', (0, auth_1.requirePermission)('DELETE_PURCHASE'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;
    const purchase = await index_1.prisma.purchase.findFirst({
        where: { id, shopId },
        include: { items: true },
    });
    if (!purchase) {
        throw new errorHandler_1.NotFoundError('Purchase');
    }
    if (purchase.status === constants_1.InvoiceStatus.CANCELLED) {
        throw new errorHandler_1.BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Purchase already cancelled');
    }
    await index_1.prisma.$transaction(async (tx) => {
        // Reverse stock for each item
        for (const item of purchase.items) {
            const product = await tx.product.findUnique({ where: { id: item.productId }, select: { currentStock: true } });
            const qtyBefore = product?.currentStock || 0;
            const qtyAfter = qtyBefore - item.quantity;
            if (qtyAfter < 0) {
                throw new errorHandler_1.BusinessLogicError('NEGATIVE_STOCK_NOT_ALLOWED', `Insufficient stock to cancel purchase for product ${item.productId}`);
            }
            // Create reversal movement
            await tx.stockMovement.create({
                data: {
                    shopId,
                    productId: item.productId,
                    batchId: item.batchId,
                    movementType: constants_1.MovementType.PURCHASE_RETURN,
                    quantityDelta: -item.quantity,
                    quantityBefore: qtyBefore,
                    quantityAfter: qtyAfter,
                    referenceType: constants_1.ReferenceType.PURCHASE,
                    referenceId: id,
                    reason: reason || `Purchase cancelled: ${purchase.invoiceNumber}`,
                    actorId: userId,
                    unitCost: item.unitCost,
                },
            });
            // Update product stock
            await tx.product.update({
                where: { id: item.productId },
                data: { currentStock: qtyAfter },
            });
            // Update batch quantity
            if (item.batchId) {
                await tx.batch.update({
                    where: { id: item.batchId },
                    data: { quantityAvailable: { decrement: item.quantity } },
                });
            }
        }
        // Update purchase status
        await tx.purchase.update({
            where: { id },
            data: { status: constants_1.InvoiceStatus.CANCELLED, balanceDue: 0, amountPaid: 0, paymentStatus: constants_1.PaymentStatus.UNPAID },
        });
        // Update supplier balance
        if (purchase.supplierId) {
            await tx.supplier.update({
                where: { id: purchase.supplierId },
                data: { currentBalance: { decrement: purchase.grandTotal } },
            });
        }
    });
    (0, requestLogger_1.logUpdate)(req, 'Purchase', id, { status: purchase.status }, { status: constants_1.InvoiceStatus.CANCELLED, reason });
    res.json({ success: true, data: { message: 'Purchase cancelled successfully' } });
}));
exports.default = router;
//# sourceMappingURL=purchase.js.map