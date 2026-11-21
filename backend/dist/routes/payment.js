"use strict";
/**
 * Payment Routes
 * Payment management across purchases and sales
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const requestLogger_1 = require("../middleware/requestLogger");
const utils_1 = require("@shopstock/shared/utils");
const constants_1 = require("@shopstock/shared/constants");
const router = (0, express_1.Router)();
// ============================================
// List Payments
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50, partyType, partyId, referenceType, referenceId, method, startDate, endDate } = req.query;
    const where = { shopId };
    if (partyType)
        where.partyType = partyType;
    if (partyId)
        where.partyId = partyId;
    if (referenceType)
        where.referenceType = referenceType;
    if (referenceId)
        where.referenceId = referenceId;
    if (method)
        where.method = method;
    if (startDate || endDate) {
        where.paidAt = {};
        if (startDate)
            where.paidAt.gte = new Date(startDate);
        if (endDate)
            where.paidAt.lte = new Date(endDate);
    }
    const [payments, total] = await Promise.all([
        index_1.prisma.payment.findMany({
            where,
            include: {
                customer: { select: { id: true, businessName: true } },
                supplier: { select: { id: true, name: true } },
                purchase: { select: { id: true, invoiceNumber: true } },
                salesInvoice: { select: { id: true, invoiceNumber: true } },
                creator: { select: { id: true, name: true } },
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { paidAt: 'desc' },
        }),
        index_1.prisma.payment.count({ where }),
    ]);
    res.json({
        success: true,
        data: { payments: payments.map(p => ({ ...p, amountFormatted: (0, utils_1.formatCurrency)(p.amount) })) },
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
}));
// ============================================
// Get Payment by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const payment = await index_1.prisma.payment.findFirst({
        where: { id, shopId },
        include: {
            customer: { select: { id: true, businessName: true, phone: true } },
            supplier: { select: { id: true, name: true, phone: true } },
            purchase: { select: { id: true, invoiceNumber: true, grandTotal: true, amountPaid: true, balanceDue: true } },
            salesInvoice: { select: { id: true, invoiceNumber: true, grandTotal: true, amountPaid: true, balanceDue: true } },
            creator: { select: { id: true, name: true } },
        },
    });
    if (!payment)
        throw new errorHandler_1.NotFoundError('Payment');
    res.json({
        success: true,
        data: { payment: { ...payment, amountFormatted: (0, utils_1.formatCurrency)(payment.amount) } },
    });
}));
// ============================================
// Create Payment (Generic)
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_PAYMENTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { partyType, partyId, referenceType, referenceId, amount, method, paidAt, referenceNumber, notes } = req.body;
    if (!partyType || !partyId || !referenceType || !referenceId || !amount || !method) {
        throw new errorHandler_1.ValidationError('Required fields: partyType, partyId, referenceType, referenceId, amount, method');
    }
    const paymentAmount = (0, utils_1.toMinorUnits)(amount);
    if (paymentAmount <= 0)
        throw new errorHandler_1.ValidationError('Payment amount must be positive');
    // Verify party exists
    if (partyType === constants_1.PartyType.CUSTOMER) {
        const customer = await index_1.prisma.customer.findFirst({ where: { id: partyId, shopId } });
        if (!customer)
            throw new errorHandler_1.NotFoundError('Customer');
    }
    else if (partyType === constants_1.PartyType.SUPPLIER) {
        const supplier = await index_1.prisma.supplier.findFirst({ where: { id: partyId, shopId } });
        if (!supplier)
            throw new errorHandler_1.NotFoundError('Supplier');
    }
    // Verify reference exists
    if (referenceType === constants_1.ReferenceType.SALE) {
        const invoice = await index_1.prisma.salesInvoice.findFirst({ where: { id: referenceId, shopId } });
        if (!invoice)
            throw new errorHandler_1.NotFoundError('Sales Invoice');
        if (paymentAmount > invoice.balanceDue)
            throw new errorHandler_1.ValidationError('Payment exceeds balance due');
    }
    else if (referenceType === constants_1.ReferenceType.PURCHASE) {
        const purchase = await index_1.prisma.purchase.findFirst({ where: { id: referenceId, shopId } });
        if (!purchase)
            throw new errorHandler_1.NotFoundError('Purchase');
        if (paymentAmount > purchase.balanceDue)
            throw new errorHandler_1.ValidationError('Payment exceeds balance due');
    }
    const payment = await index_1.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
            data: {
                shopId,
                partyType,
                partyId,
                referenceType,
                referenceId,
                amount: paymentAmount,
                method,
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                referenceNumber,
                notes,
                createdBy: userId,
            },
        });
        // Update balances and ledgers based on party/reference type
        if (partyType === constants_1.PartyType.CUSTOMER && referenceType === constants_1.ReferenceType.SALE) {
            const invoice = await tx.salesInvoice.findUnique({ where: { id: referenceId } });
            if (invoice) {
                const newAmountPaid = invoice.amountPaid + paymentAmount;
                const newBalanceDue = invoice.grandTotal - newAmountPaid;
                let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
                if (newAmountPaid >= invoice.grandTotal)
                    newPaymentStatus = constants_1.PaymentStatus.PAID;
                else if (newAmountPaid === 0)
                    newPaymentStatus = constants_1.PaymentStatus.UNPAID;
                await tx.salesInvoice.update({ where: { id: referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
                await tx.customer.update({ where: { id: partyId }, data: { currentBalance: { decrement: paymentAmount } } });
                await tx.customerLedgerEntry.create({
                    data: { shopId, customerId: partyId, entryType: 'CREDIT', referenceType: constants_1.ReferenceType.PAYMENT, referenceId: created.id, debit: 0, credit: paymentAmount, balanceAfter: invoice.balanceDue - paymentAmount, description: `Payment for invoice ${invoice.invoiceNumber}` },
                });
            }
        }
        else if (partyType === constants_1.PartyType.SUPPLIER && referenceType === constants_1.ReferenceType.PURCHASE) {
            const purchase = await tx.purchase.findUnique({ where: { id: referenceId } });
            if (purchase) {
                const newAmountPaid = purchase.amountPaid + paymentAmount;
                const newBalanceDue = purchase.grandTotal - newAmountPaid;
                let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
                if (newAmountPaid >= purchase.grandTotal)
                    newPaymentStatus = constants_1.PaymentStatus.PAID;
                else if (newAmountPaid === 0)
                    newPaymentStatus = constants_1.PaymentStatus.UNPAID;
                await tx.purchase.update({ where: { id: referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
                await tx.supplier.update({ where: { id: partyId }, data: { currentBalance: { decrement: paymentAmount } } });
                await tx.supplierLedgerEntry.create({
                    data: { shopId, supplierId: partyId, entryType: 'DEBIT', referenceType: constants_1.ReferenceType.PAYMENT, referenceId: created.id, debit: paymentAmount, credit: 0, balanceAfter: purchase.balanceDue - paymentAmount, description: `Payment for purchase ${purchase.invoiceNumber}` },
                });
            }
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'Payment', payment.id, req.body);
    res.status(201).json({ success: true, data: { payment: { ...payment, amountFormatted: (0, utils_1.formatCurrency)(payment.amount) } } });
}));
// ============================================
// Delete Payment (Reverse)
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_PAYMENTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const payment = await index_1.prisma.payment.findFirst({ where: { id, shopId } });
    if (!payment)
        throw new errorHandler_1.NotFoundError('Payment');
    await index_1.prisma.$transaction(async (tx) => {
        // Reverse balances
        if (payment.partyType === constants_1.PartyType.CUSTOMER && payment.referenceType === constants_1.ReferenceType.SALE) {
            const invoice = await tx.salesInvoice.findUnique({ where: { id: payment.referenceId } });
            if (invoice) {
                const newAmountPaid = invoice.amountPaid - payment.amount;
                const newBalanceDue = invoice.grandTotal - newAmountPaid;
                let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
                if (newAmountPaid >= invoice.grandTotal)
                    newPaymentStatus = constants_1.PaymentStatus.PAID;
                else if (newAmountPaid === 0)
                    newPaymentStatus = constants_1.PaymentStatus.UNPAID;
                await tx.salesInvoice.update({ where: { id: payment.referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
                await tx.customer.update({ where: { id: payment.partyId }, data: { currentBalance: { increment: payment.amount } } });
            }
        }
        else if (payment.partyType === constants_1.PartyType.SUPPLIER && payment.referenceType === constants_1.ReferenceType.PURCHASE) {
            const purchase = await tx.purchase.findUnique({ where: { id: payment.referenceId } });
            if (purchase) {
                const newAmountPaid = purchase.amountPaid - payment.amount;
                const newBalanceDue = purchase.grandTotal - newAmountPaid;
                let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
                if (newAmountPaid >= purchase.grandTotal)
                    newPaymentStatus = constants_1.PaymentStatus.PAID;
                else if (newAmountPaid === 0)
                    newPaymentStatus = constants_1.PaymentStatus.UNPAID;
                await tx.purchase.update({ where: { id: payment.referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
                await tx.supplier.update({ where: { id: payment.partyId }, data: { currentBalance: { increment: payment.amount } } });
            }
        }
        // Delete ledger entries
        await tx.customerLedgerEntry.deleteMany({ where: { referenceType: constants_1.ReferenceType.PAYMENT, referenceId: id } });
        await tx.supplierLedgerEntry.deleteMany({ where: { referenceType: constants_1.ReferenceType.PAYMENT, referenceId: id } });
        // Delete payment
        await tx.payment.delete({ where: { id } });
    });
    res.json({ success: true, data: { message: 'Payment reversed successfully' } });
}));
// ============================================
// Payment Methods Reference
// ============================================
router.get('/meta/methods', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const methods = Object.values(constants_1.PaymentMethod).map(m => ({ value: m, label: m }));
    res.json({ success: true, data: { methods } });
}));
exports.default = router;
//# sourceMappingURL=payment.js.map