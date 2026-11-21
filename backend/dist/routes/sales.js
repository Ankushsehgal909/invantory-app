"use strict";
/**
 * Sales Invoice Routes
 * Wholesale/B2B sales with discounts, payments, PDF generation
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
// List Sales Invoices
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 20, search, customerId, startDate, endDate, paymentStatus, status, sortBy = 'invoiceDate', sortOrder = 'desc' } = req.query;
    const where = { shopId };
    if (search) {
        where.OR = [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { customer: { businessName: { contains: search, mode: 'insensitive' } } },
        ];
    }
    if (customerId)
        where.customerId = customerId;
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    if (status)
        where.status = status;
    if (startDate || endDate) {
        where.invoiceDate = {};
        if (startDate)
            where.invoiceDate.gte = new Date(startDate);
        if (endDate)
            where.invoiceDate.lte = new Date(endDate);
    }
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    const [invoices, total] = await Promise.all([
        index_1.prisma.salesInvoice.findMany({
            where,
            include: {
                customer: { select: { id: true, businessName: true, phone: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true } },
                        batch: { select: { id: true, batchNumber: true } },
                    },
                },
                _count: { select: { items: true } },
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy,
        }),
        index_1.prisma.salesInvoice.count({ where }),
    ]);
    res.json({
        success: true,
        data: { invoices },
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
// Get Sales Invoice by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const invoice = await index_1.prisma.salesInvoice.findFirst({
        where: { id, shopId },
        include: {
            customer: { select: { id: true, businessName: true, contactPerson: true, phone: true, email: true, billingAddress: true, gstin: true } },
            items: {
                include: {
                    product: { select: { id: true, name: true, sku: true, unit: true, purchaseCost: true, sellingPrice: true } },
                    batch: { select: { id: true, batchNumber: true, expiryDate: true, quantityAvailable: true } },
                },
            },
            payments: {
                orderBy: { paidAt: 'desc' },
                select: { id: true, amount: true, method: true, paidAt: true, referenceNumber: true, notes: true },
            },
            creditNotes: { select: { id: true, amount: true, reason: true, createdAt: true, status: true } },
        },
    });
    if (!invoice) {
        throw new errorHandler_1.NotFoundError('Sales Invoice');
    }
    res.json({
        success: true,
        data: {
            invoice: {
                ...invoice,
                subtotalFormatted: (0, utils_1.formatCurrency)(invoice.subtotal),
                discountFormatted: (0, utils_1.formatCurrency)(invoice.discount),
                taxFormatted: (0, utils_1.formatCurrency)(invoice.tax),
                additionalChargesFormatted: (0, utils_1.formatCurrency)(invoice.additionalCharges),
                roundingAdjustmentFormatted: (0, utils_1.formatCurrency)(invoice.roundingAdjustment),
                grandTotalFormatted: (0, utils_1.formatCurrency)(invoice.grandTotal),
                amountPaidFormatted: (0, utils_1.formatCurrency)(invoice.amountPaid),
                balanceDueFormatted: (0, utils_1.formatCurrency)(invoice.balanceDue),
                items: invoice.items.map(item => ({
                    ...item,
                    unitPriceFormatted: (0, utils_1.formatCurrency)(item.unitPrice),
                    discountFormatted: (0, utils_1.formatCurrency)(item.discount),
                    taxFormatted: (0, utils_1.formatCurrency)(item.tax),
                    lineTotalFormatted: (0, utils_1.formatCurrency)(item.lineTotal),
                    costSnapshotFormatted: (0, utils_1.formatCurrency)(item.costSnapshot),
                    margin: item.lineTotal - (item.quantity * item.costSnapshot),
                    marginFormatted: (0, utils_1.formatCurrency)(item.lineTotal - (item.quantity * item.costSnapshot)),
                })),
                payments: invoice.payments.map(p => ({
                    ...p,
                    amountFormatted: (0, utils_1.formatCurrency)(p.amount),
                })),
            },
        },
    });
}));
// ============================================
// Create Sales Invoice
// ============================================
router.post('/', (0, auth_1.requirePermission)('CREATE_SALE'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const validation = validators_1.createSalesInvoiceSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const { items, ...invoiceData } = validation.data;
    // Generate invoice number
    const lastInvoice = await index_1.prisma.salesInvoice.findFirst({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
    });
    const sequence = lastInvoice
        ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1
        : 1;
    const shop = await index_1.prisma.shop.findUnique({ where: { id: shopId }, select: { invoicePrefix: true } });
    const invoiceNumber = (0, utils_1.generateInvoiceNumber)(shop?.invoicePrefix || 'INV-', sequence);
    // Validate stock and calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    for (const item of items) {
        const lineSubtotal = item.quantity * item.unitPrice;
        subtotal += lineSubtotal;
        const itemDiscount = (0, utils_1.calculateDiscount)(lineSubtotal, item.discount || 0, item.discountType || constants_1.DiscountType.FIXED);
        totalDiscount += itemDiscount;
        totalTax += item.tax || 0;
    }
    const additionalCharges = invoiceData.additionalCharges || 0;
    const roundingAdjustment = invoiceData.roundingAdjustment || 0;
    const grandTotal = subtotal - totalDiscount + totalTax + additionalCharges + roundingAdjustment;
    const amountPaid = invoiceData.amountPaid || 0;
    const balanceDue = grandTotal - amountPaid;
    let paymentStatus = constants_1.PaymentStatus.UNPAID;
    if (amountPaid >= grandTotal)
        paymentStatus = constants_1.PaymentStatus.PAID;
    else if (amountPaid > 0)
        paymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
    // Create invoice with items in transaction
    const invoice = await index_1.prisma.$transaction(async (tx) => {
        // Check stock availability and reserve batches (FEFO)
        for (const item of items) {
            const product = await tx.product.findUnique({
                where: { id: item.productId },
                include: {
                    batches: {
                        where: { quantityAvailable: { gt: 0 }, expiryDate: { not: null } },
                        orderBy: { expiryDate: 'asc' }, // FEFO
                    },
                },
            });
            if (!product) {
                throw new errorHandler_1.NotFoundError(`Product ${item.productId}`);
            }
            let availableQty = product.currentStock;
            if (item.batchId) {
                const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
                if (!batch || batch.quantityAvailable < item.quantity) {
                    throw new errorHandler_1.BusinessLogicError('INSUFFICIENT_STOCK', `Insufficient stock in batch for product ${product.name}`);
                }
                availableQty = batch.quantityAvailable;
            }
            else if (product.expiryMode === 'BATCH_LEVEL') {
                // FEFO allocation
                let remainingQty = item.quantity;
                for (const batch of product.batches) {
                    if (remainingQty <= 0)
                        break;
                    const takeQty = Math.min(batch.quantityAvailable, remainingQty);
                    remainingQty -= takeQty;
                }
                if (remainingQty > 0) {
                    throw new errorHandler_1.BusinessLogicError('INSUFFICIENT_STOCK', `Insufficient stock for product ${product.name} (FEFO)`);
                }
            }
            else if (availableQty < item.quantity) {
                throw new errorHandler_1.BusinessLogicError('INSUFFICIENT_STOCK', `Insufficient stock for product ${product.name}`);
            }
        }
        // Create invoice
        const created = await tx.salesInvoice.create({
            data: {
                ...invoiceData,
                shopId,
                invoiceNumber,
                subtotal,
                discount: totalDiscount,
                tax: totalTax,
                additionalCharges,
                roundingAdjustment,
                grandTotal,
                amountPaid,
                balanceDue,
                paymentStatus,
                createdBy: userId,
                items: {
                    create: items.map(item => ({
                        ...item,
                        unitPrice: (0, utils_1.toMinorUnits)(item.unitPrice),
                        discount: (0, utils_1.toMinorUnits)(item.discount || 0),
                        tax: (0, utils_1.toMinorUnits)(item.tax || 0),
                        lineTotal: (0, utils_1.toMinorUnits)(item.quantity * item.unitPrice - (0, utils_1.calculateDiscount)(item.quantity * item.unitPrice, item.discount || 0, item.discountType || constants_1.DiscountType.FIXED) + (item.tax || 0)),
                        costSnapshot: (0, utils_1.toMinorUnits)(item.unitPrice * 0.7), // Placeholder - should use actual cost
                    })),
                },
            },
            include: { items: true },
        });
        // Process each item: reduce stock, create movements
        for (const item of created.items) {
            const inputItem = items.find(i => i.productId === item.productId);
            if (!inputItem)
                continue;
            let batchId = inputItem.batchId;
            let remainingQty = inputItem.quantity;
            if (!batchId && inputItem.productId) {
                const product = await tx.product.findUnique({
                    where: { id: inputItem.productId },
                    include: {
                        batches: {
                            where: { quantityAvailable: { gt: 0 } },
                            orderBy: { expiryDate: 'asc' }, // FEFO
                        },
                    },
                });
                if (product?.expiryMode === 'BATCH_LEVEL' && product.batches.length > 0) {
                    // FEFO allocation
                    for (const batch of product.batches) {
                        if (remainingQty <= 0)
                            break;
                        const takeQty = Math.min(batch.quantityAvailable, remainingQty);
                        // Create stock movement for this batch
                        const qtyBefore = batch.quantityAvailable;
                        const qtyAfter = qtyBefore - takeQty;
                        await tx.stockMovement.create({
                            data: {
                                shopId,
                                productId: inputItem.productId,
                                batchId: batch.id,
                                movementType: constants_1.MovementType.SALE,
                                quantityDelta: -takeQty,
                                quantityBefore: qtyBefore,
                                quantityAfter: qtyAfter,
                                referenceType: constants_1.ReferenceType.SALE,
                                referenceId: created.id,
                                reason: `Sale ${created.invoiceNumber}`,
                                actorId: userId,
                                unitCost: batch.unitCost,
                            },
                        });
                        // Update batch
                        await tx.batch.update({
                            where: { id: batch.id },
                            data: { quantityAvailable: qtyAfter },
                        });
                        remainingQty -= takeQty;
                    }
                }
                else {
                    // No batch tracking or single batch
                    const productStock = await tx.product.findUnique({ where: { id: inputItem.productId }, select: { currentStock: true } });
                    const qtyBefore = productStock?.currentStock || 0;
                    const qtyAfter = qtyBefore - inputItem.quantity;
                    await tx.stockMovement.create({
                        data: {
                            shopId,
                            productId: inputItem.productId,
                            batchId: null,
                            movementType: constants_1.MovementType.SALE,
                            quantityDelta: -inputItem.quantity,
                            quantityBefore: qtyBefore,
                            quantityAfter: qtyAfter,
                            referenceType: constants_1.ReferenceType.SALE,
                            referenceId: created.id,
                            reason: `Sale ${created.invoiceNumber}`,
                            actorId: userId,
                            unitCost: product?.purchaseCost,
                        },
                    });
                    // Update product stock
                    await tx.product.update({
                        where: { id: inputItem.productId },
                        data: { currentStock: qtyAfter },
                    });
                    remainingQty = 0;
                }
            }
            else if (batchId) {
                // Specific batch selected
                const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { quantityAvailable: true, unitCost: true } });
                if (!batch)
                    throw new errorHandler_1.NotFoundError('Batch');
                const qtyBefore = batch.quantityAvailable;
                const qtyAfter = qtyBefore - inputItem.quantity;
                await tx.stockMovement.create({
                    data: {
                        shopId,
                        productId: inputItem.productId,
                        batchId,
                        movementType: constants_1.MovementType.SALE,
                        quantityDelta: -inputItem.quantity,
                        quantityBefore: qtyBefore,
                        quantityAfter: qtyAfter,
                        referenceType: constants_1.ReferenceType.SALE,
                        referenceId: created.id,
                        reason: `Sale ${created.invoiceNumber}`,
                        actorId: userId,
                        unitCost: batch.unitCost,
                    },
                });
                await tx.batch.update({
                    where: { id: batchId },
                    data: { quantityAvailable: qtyAfter },
                });
                remainingQty = 0;
            }
            if (remainingQty > 0) {
                throw new errorHandler_1.BusinessLogicError('INSUFFICIENT_STOCK', `Could not allocate all stock for product ${inputItem.productId}`);
            }
        }
        // Handle customer payment and ledger
        if (invoiceData.customerId) {
            // Create payment record if amount paid > 0
            if (amountPaid > 0 && invoiceData.paymentMethod) {
                await tx.payment.create({
                    data: {
                        shopId,
                        partyType: constants_1.PartyType.CUSTOMER,
                        partyId: invoiceData.customerId,
                        referenceType: constants_1.ReferenceType.SALE,
                        referenceId: created.id,
                        amount: (0, utils_1.toMinorUnits)(amountPaid),
                        method: invoiceData.paymentMethod,
                        paidAt: new Date(invoiceData.invoiceDate),
                        createdBy: userId,
                    },
                });
            }
            // Update customer balance
            await tx.customer.update({
                where: { id: invoiceData.customerId },
                data: { currentBalance: { increment: (0, utils_1.toMinorUnits)(balanceDue) } },
            });
            // Create customer ledger entry
            await tx.customerLedgerEntry.create({
                data: {
                    shopId,
                    customerId: invoiceData.customerId,
                    entryType: constants_1.LedgerEntryType.DEBIT, // Customer owes us
                    referenceType: constants_1.ReferenceType.SALE,
                    referenceId: created.id,
                    debit: (0, utils_1.toMinorUnits)(grandTotal),
                    credit: 0,
                    balanceAfter: (0, utils_1.toMinorUnits)(grandTotal), // Would need proper calculation
                    description: `Invoice ${invoiceNumber}`,
                },
            });
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'SalesInvoice', invoice.id, validation.data);
    res.status(201).json({
        success: true,
        data: {
            invoice: {
                ...invoice,
                subtotalFormatted: (0, utils_1.formatCurrency)(invoice.subtotal),
                discountFormatted: (0, utils_1.formatCurrency)(invoice.discount),
                taxFormatted: (0, utils_1.formatCurrency)(invoice.tax),
                additionalChargesFormatted: (0, utils_1.formatCurrency)(invoice.additionalCharges),
                roundingAdjustmentFormatted: (0, utils_1.formatCurrency)(invoice.roundingAdjustment),
                grandTotalFormatted: (0, utils_1.formatCurrency)(invoice.grandTotal),
                amountPaidFormatted: (0, utils_1.formatCurrency)(invoice.amountPaid),
                balanceDueFormatted: (0, utils_1.formatCurrency)(invoice.balanceDue),
            },
        },
    });
}));
// ============================================
// Update Sales Invoice
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('EDIT_SALE'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const invoice = await index_1.prisma.salesInvoice.findFirst({
        where: { id, shopId },
    });
    if (!invoice) {
        throw new errorHandler_1.NotFoundError('Sales Invoice');
    }
    if (invoice.status === constants_1.InvoiceStatus.CANCELLED || invoice.status === constants_1.InvoiceStatus.REFUNDED) {
        throw new errorHandler_1.BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Cannot edit cancelled or refunded invoice');
    }
    const { notes, paymentStatus, amountPaid, paymentMethod, dueDate } = req.body;
    const updateData = {};
    if (notes !== undefined)
        updateData.notes = notes;
    if (dueDate)
        updateData.dueDate = new Date(dueDate);
    if (paymentStatus)
        updateData.paymentStatus = paymentStatus;
    if (amountPaid !== undefined && amountPaid !== invoice.amountPaid) {
        const newAmountPaid = (0, utils_1.toMinorUnits)(amountPaid);
        const diff = newAmountPaid - invoice.amountPaid;
        updateData.amountPaid = newAmountPaid;
        updateData.balanceDue = invoice.grandTotal - newAmountPaid;
        if (newAmountPaid >= invoice.grandTotal)
            updateData.paymentStatus = constants_1.PaymentStatus.PAID;
        else if (newAmountPaid > 0)
            updateData.paymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
        else
            updateData.paymentStatus = constants_1.PaymentStatus.UNPAID;
        // Create payment record for additional payment
        if (diff > 0 && paymentMethod && invoice.customerId) {
            await index_1.prisma.payment.create({
                data: {
                    shopId,
                    partyType: constants_1.PartyType.CUSTOMER,
                    partyId: invoice.customerId,
                    referenceType: constants_1.ReferenceType.SALE,
                    referenceId: id,
                    amount: diff,
                    method: paymentMethod,
                    paidAt: new Date(),
                    createdBy: req.user?.id,
                },
            });
        }
    }
    const updatedInvoice = await index_1.prisma.salesInvoice.update({
        where: { id },
        data: updateData,
    });
    (0, requestLogger_1.logUpdate)(req, 'SalesInvoice', id, {}, updateData);
    res.json({ success: true, data: { invoice: updatedInvoice } });
}));
// ============================================
// Cancel Sales Invoice
// ============================================
router.post('/:id/cancel', (0, auth_1.requirePermission)('DELETE_SALE'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;
    const invoice = await index_1.prisma.salesInvoice.findFirst({
        where: { id, shopId },
        include: { items: { include: { batch: true } } },
    });
    if (!invoice) {
        throw new errorHandler_1.NotFoundError('Sales Invoice');
    }
    if (invoice.status === constants_1.InvoiceStatus.CANCELLED || invoice.status === constants_1.InvoiceStatus.REFUNDED) {
        throw new errorHandler_1.BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Invoice already cancelled or refunded');
    }
    await index_1.prisma.$transaction(async (tx) => {
        // Restore stock for each item
        for (const item of invoice.items) {
            const product = await tx.product.findUnique({ where: { id: item.productId }, select: { currentStock: true } });
            const qtyBefore = product?.currentStock || 0;
            const qtyAfter = qtyBefore + item.quantity;
            // Create reversal movement
            await tx.stockMovement.create({
                data: {
                    shopId,
                    productId: item.productId,
                    batchId: item.batchId,
                    movementType: constants_1.MovementType.SALE_RETURN,
                    quantityDelta: item.quantity,
                    quantityBefore: qtyBefore,
                    quantityAfter: qtyAfter,
                    referenceType: constants_1.ReferenceType.SALE,
                    referenceId: id,
                    reason: reason || `Invoice cancelled: ${invoice.invoiceNumber}`,
                    actorId: userId,
                    unitCost: item.costSnapshot,
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
                    data: { quantityAvailable: { increment: item.quantity } },
                });
            }
        }
        // Update invoice status
        await tx.salesInvoice.update({
            where: { id },
            data: { status: constants_1.InvoiceStatus.CANCELLED, balanceDue: 0, amountPaid: 0, paymentStatus: constants_1.PaymentStatus.UNPAID },
        });
        // Update customer balance
        if (invoice.customerId) {
            await tx.customer.update({
                where: { id: invoice.customerId },
                data: { currentBalance: { decrement: invoice.grandTotal } },
            });
        }
    });
    (0, requestLogger_1.logUpdate)(req, 'SalesInvoice', id, { status: invoice.status }, { status: constants_1.InvoiceStatus.CANCELLED, reason });
    res.json({ success: true, data: { message: 'Sales invoice cancelled successfully' } });
}));
// ============================================
// Record Payment for Invoice
// ============================================
router.post('/:id/payments', (0, auth_1.requirePermission)('MANAGE_PAYMENTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount, method, paidAt, referenceNumber, notes } = req.body;
    const invoice = await index_1.prisma.salesInvoice.findFirst({
        where: { id, shopId },
    });
    if (!invoice) {
        throw new errorHandler_1.NotFoundError('Sales Invoice');
    }
    if (invoice.status === constants_1.InvoiceStatus.CANCELLED || invoice.status === constants_1.InvoiceStatus.REFUNDED) {
        throw new errorHandler_1.BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Cannot add payment to cancelled invoice');
    }
    const paymentAmount = (0, utils_1.toMinorUnits)(amount);
    if (paymentAmount > invoice.balanceDue) {
        throw new errorHandler_1.ValidationError('Payment amount exceeds balance due');
    }
    const payment = await index_1.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
            data: {
                shopId,
                partyType: constants_1.PartyType.CUSTOMER,
                partyId: invoice.customerId,
                referenceType: constants_1.ReferenceType.SALE,
                referenceId: id,
                amount: paymentAmount,
                method,
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                referenceNumber,
                notes,
                createdBy: userId,
            },
        });
        // Update invoice
        const newAmountPaid = invoice.amountPaid + paymentAmount;
        const newBalanceDue = invoice.grandTotal - newAmountPaid;
        let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= invoice.grandTotal)
            newPaymentStatus = constants_1.PaymentStatus.PAID;
        else if (newAmountPaid === 0)
            newPaymentStatus = constants_1.PaymentStatus.UNPAID;
        await tx.salesInvoice.update({
            where: { id },
            data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus },
        });
        // Update customer ledger
        await tx.customerLedgerEntry.create({
            data: {
                shopId,
                customerId: invoice.customerId,
                entryType: constants_1.LedgerEntryType.CREDIT,
                referenceType: constants_1.ReferenceType.PAYMENT,
                referenceId: created.id,
                debit: 0,
                credit: paymentAmount,
                balanceAfter: newBalanceDue, // Simplified
                description: `Payment received for invoice ${invoice.invoiceNumber}`,
            },
        });
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'Payment', payment.id, { invoiceId: id, amount });
    res.status(201).json({
        success: true,
        data: { payment: { ...payment, amountFormatted: (0, utils_1.formatCurrency)(payment.amount) } },
    });
}));
exports.default = router;
//# sourceMappingURL=sales.js.map