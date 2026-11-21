"use strict";
/**
 * Supplier Routes
 * Supplier CRUD, ledger, payments
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("@shopstock/shared/validators");
const requestLogger_1 = require("../middleware/requestLogger");
const utils_1 = require("@shopstock/shared/utils");
const constants_1 = require("@shopstock/shared/constants");
const router = (0, express_1.Router)();
// ============================================
// List Suppliers
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50, search, isActive } = req.query;
    const where = { shopId };
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (isActive !== undefined)
        where.isActive = isActive === 'true';
    const [suppliers, total] = await Promise.all([
        index_1.prisma.supplier.findMany({
            where,
            include: { _count: { select: { purchases: true, payments: true } } },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { name: 'asc' },
        }),
        index_1.prisma.supplier.count({ where }),
    ]);
    res.json({
        success: true,
        data: { suppliers: suppliers.map(s => ({
                ...s,
                openingBalanceFormatted: (0, utils_1.formatCurrency)(s.openingBalance),
                currentBalanceFormatted: (0, utils_1.formatCurrency)(s.currentBalance),
            })) },
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
}));
// ============================================
// Get Supplier by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const supplier = await index_1.prisma.supplier.findFirst({
        where: { id, shopId },
        include: {
            purchases: { take: 10, orderBy: { purchaseDate: 'desc' }, include: { _count: { select: { items: true } } } },
            payments: { take: 10, orderBy: { paidAt: 'desc' } },
            ledgerEntries: { take: 20, orderBy: { createdAt: 'desc' } },
        },
    });
    if (!supplier)
        throw new errorHandler_1.NotFoundError('Supplier');
    res.json({
        success: true,
        data: {
            supplier: {
                ...supplier,
                openingBalanceFormatted: (0, utils_1.formatCurrency)(supplier.openingBalance),
                currentBalanceFormatted: (0, utils_1.formatCurrency)(supplier.currentBalance),
                purchases: supplier.purchases.map(p => ({ ...p, grandTotalFormatted: (0, utils_1.formatCurrency)(p.grandTotal) })),
                payments: supplier.payments.map(p => ({ ...p, amountFormatted: (0, utils_1.formatCurrency)(p.amount) })),
                ledgerEntries: supplier.ledgerEntries.map(e => ({ ...e, debitFormatted: (0, utils_1.formatCurrency)(e.debit), creditFormatted: (0, utils_1.formatCurrency)(e.credit), balanceAfterFormatted: (0, utils_1.formatCurrency)(e.balanceAfter) })),
            },
        },
    });
}));
// ============================================
// Create Supplier
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_SUPPLIERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const validation = validators_1.createSupplierSchema.safeParse(req.body);
    if (!validation.success)
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    const existing = await index_1.prisma.supplier.findFirst({ where: { shopId, name: validation.data.name } });
    if (existing)
        throw new errorHandler_1.ConflictError('Supplier name already exists');
    const supplier = await index_1.prisma.supplier.create({
        data: { ...validation.data, shopId, openingBalance: (0, utils_1.toMinorUnits)(validation.data.openingBalance || 0) },
    });
    // Create opening balance ledger entry if > 0
    if (validation.data.openingBalance && validation.data.openingBalance > 0) {
        await index_1.prisma.supplierLedgerEntry.create({
            data: {
                shopId,
                supplierId: supplier.id,
                entryType: constants_1.LedgerEntryType.CREDIT,
                referenceType: constants_1.ReferenceType.OPENING_BALANCE,
                referenceId: supplier.id,
                debit: 0,
                credit: (0, utils_1.toMinorUnits)(validation.data.openingBalance),
                balanceAfter: (0, utils_1.toMinorUnits)(validation.data.openingBalance),
                description: 'Opening balance',
            },
        });
    }
    (0, requestLogger_1.logCreate)(req, 'Supplier', supplier.id, validation.data);
    res.status(201).json({ success: true, data: { supplier } });
}));
// ============================================
// Update Supplier
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('MANAGE_SUPPLIERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const validation = validators_1.updateSupplierSchema.safeParse(req.body);
    if (!validation.success)
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    const supplier = await index_1.prisma.supplier.findFirst({ where: { id, shopId } });
    if (!supplier)
        throw new errorHandler_1.NotFoundError('Supplier');
    if (validation.data.name && validation.data.name !== supplier.name) {
        const existing = await index_1.prisma.supplier.findFirst({ where: { shopId, name: validation.data.name, id: { not: id } } });
        if (existing)
            throw new errorHandler_1.ConflictError('Supplier name already exists');
    }
    const updatedSupplier = await index_1.prisma.supplier.update({
        where: { id },
        data: validation.data,
    });
    (0, requestLogger_1.logUpdate)(req, 'Supplier', id, {}, validation.data);
    res.json({ success: true, data: { supplier: updatedSupplier } });
}));
// ============================================
// Delete Supplier
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_SUPPLIERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const supplier = await index_1.prisma.supplier.findFirst({
        where: { id, shopId },
        include: { _count: { select: { purchases: true, payments: true, ledgerEntries: true } } },
    });
    if (!supplier)
        throw new errorHandler_1.NotFoundError('Supplier');
    if (supplier._count.purchases > 0 || supplier._count.payments > 0 || supplier._count.ledgerEntries > 0) {
        throw new errorHandler_1.ValidationError('Cannot delete supplier with transaction history. Deactivate instead.');
    }
    await index_1.prisma.supplier.delete({ where: { id } });
    (0, requestLogger_1.logDelete)(req, 'Supplier', id, {});
    res.json({ success: true, data: { message: 'Supplier deleted successfully' } });
}));
// ============================================
// Record Supplier Payment
// ============================================
router.post('/:id/payments', (0, auth_1.requirePermission)('MANAGE_PAYMENTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount, method, paidAt, referenceNumber, notes, purchaseId } = req.body;
    const supplier = await index_1.prisma.supplier.findFirst({ where: { id, shopId } });
    if (!supplier)
        throw new errorHandler_1.NotFoundError('Supplier');
    const paymentAmount = (0, utils_1.toMinorUnits)(amount);
    if (paymentAmount <= 0)
        throw new errorHandler_1.ValidationError('Payment amount must be positive');
    const payment = await index_1.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
            data: {
                shopId,
                partyType: constants_1.PartyType.SUPPLIER,
                partyId: id,
                referenceType: purchaseId ? constants_1.ReferenceType.PURCHASE : constants_1.ReferenceType.PAYMENT,
                referenceId: purchaseId || id,
                amount: paymentAmount,
                method,
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                referenceNumber,
                notes,
                createdBy: userId,
            },
        });
        // Update supplier balance
        await tx.supplier.update({
            where: { id },
            data: { currentBalance: { decrement: paymentAmount } },
        });
        // Create ledger entry
        await tx.supplierLedgerEntry.create({
            data: {
                shopId,
                supplierId: id,
                entryType: constants_1.LedgerEntryType.DEBIT,
                referenceType: purchaseId ? constants_1.ReferenceType.PAYMENT : constants_1.ReferenceType.PURCHASE,
                referenceId: created.id,
                debit: paymentAmount,
                credit: 0,
                balanceAfter: supplier.currentBalance - paymentAmount,
                description: `Payment ${purchaseId ? `for purchase ${purchaseId}` : 'received'}`,
            },
        });
        // If payment is for specific purchase, update purchase
        if (purchaseId) {
            const purchase = await tx.purchase.findUnique({ where: { id: purchaseId, shopId }, select: { amountPaid: true, grandTotal: true } });
            if (purchase) {
                const newAmountPaid = purchase.amountPaid + paymentAmount;
                let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
                if (newAmountPaid >= purchase.grandTotal)
                    newPaymentStatus = constants_1.PaymentStatus.PAID;
                else if (newAmountPaid === 0)
                    newPaymentStatus = constants_1.PaymentStatus.UNPAID;
                await tx.purchase.update({
                    where: { id: purchaseId },
                    data: { amountPaid: newAmountPaid, balanceDue: purchase.grandTotal - newAmountPaid, paymentStatus: newPaymentStatus },
                });
            }
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'Payment', payment.id, { supplierId: id, amount });
    res.status(201).json({ success: true, data: { payment: { ...payment, amountFormatted: (0, utils_1.formatCurrency)(payment.amount) } } });
}));
// ============================================
// Get Supplier Ledger
// ============================================
router.get('/:id/ledger', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    const supplier = await index_1.prisma.supplier.findFirst({ where: { id, shopId } });
    if (!supplier)
        throw new errorHandler_1.NotFoundError('Supplier');
    const where = { shopId, supplierId: id };
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate)
            where.createdAt.gte = new Date(startDate);
        if (endDate)
            where.createdAt.lte = new Date(endDate);
    }
    const [entries, total] = await Promise.all([
        index_1.prisma.supplierLedgerEntry.findMany({
            where,
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        }),
        index_1.prisma.supplierLedgerEntry.count({ where }),
    ]);
    res.json({
        success: true,
        data: { entries: entries.map(e => ({ ...e, debitFormatted: (0, utils_1.formatCurrency)(e.debit), creditFormatted: (0, utils_1.formatCurrency)(e.credit), balanceAfterFormatted: (0, utils_1.formatCurrency)(e.balanceAfter) })) },
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
}));
exports.default = router;
//# sourceMappingURL=supplier.js.map