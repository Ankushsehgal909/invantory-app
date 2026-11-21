"use strict";
/**
 * Customer Routes
 * Customer CRUD, ledger, payments, credit notes
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
// List Customers
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 50, search, isActive } = req.query;
    const where = { shopId };
    if (search) {
        where.OR = [
            { businessName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (isActive !== undefined)
        where.isActive = isActive === 'true';
    const [customers, total] = await Promise.all([
        index_1.prisma.customer.findMany({
            where,
            include: { _count: { select: { salesInvoices: true, payments: true } } },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { businessName: 'asc' },
        }),
        index_1.prisma.customer.count({ where }),
    ]);
    res.json({
        success: true,
        data: { customers: customers.map(c => ({
                ...c,
                openingBalanceFormatted: (0, utils_1.formatCurrency)(c.openingBalance),
                currentBalanceFormatted: (0, utils_1.formatCurrency)(c.currentBalance),
            })) },
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
}));
// ============================================
// Get Customer by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const customer = await index_1.prisma.customer.findFirst({
        where: { id, shopId },
        include: {
            salesInvoices: { take: 10, orderBy: { invoiceDate: 'desc' }, include: { _count: { select: { items: true } } } },
            payments: { take: 10, orderBy: { paidAt: 'desc' } },
            ledgerEntries: { take: 20, orderBy: { createdAt: 'desc' } },
            creditNotes: { take: 10, orderBy: { createdAt: 'desc' } },
        },
    });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    res.json({
        success: true,
        data: {
            customer: {
                ...customer,
                openingBalanceFormatted: (0, utils_1.formatCurrency)(customer.openingBalance),
                currentBalanceFormatted: (0, utils_1.formatCurrency)(customer.currentBalance),
                salesInvoices: customer.salesInvoices.map(i => ({ ...i, grandTotalFormatted: (0, utils_1.formatCurrency)(i.grandTotal) })),
                payments: customer.payments.map(p => ({ ...p, amountFormatted: (0, utils_1.formatCurrency)(p.amount) })),
                ledgerEntries: customer.ledgerEntries.map(e => ({ ...e, debitFormatted: (0, utils_1.formatCurrency)(e.debit), creditFormatted: (0, utils_1.formatCurrency)(e.credit), balanceAfterFormatted: (0, utils_1.formatCurrency)(e.balanceAfter) })),
                creditNotes: customer.creditNotes.map(c => ({ ...c, amountFormatted: (0, utils_1.formatCurrency)(c.amount) })),
            },
        },
    });
}));
// ============================================
// Create Customer
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_CUSTOMERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const validation = validators_1.createCustomerSchema.safeParse(req.body);
    if (!validation.success)
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    const existing = await index_1.prisma.customer.findFirst({ where: { shopId, businessName: validation.data.businessName } });
    if (existing)
        throw new errorHandler_1.ConflictError('Customer business name already exists');
    const createData = {
        ...validation.data,
        shop: { connect: { id: shopId } },
        openingBalance: (0, utils_1.toMinorUnits)(validation.data.openingBalance || 0),
    };
    // Convert address objects to JSON strings
    if (validation.data.billingAddress)
        createData.billingAddress = JSON.stringify(validation.data.billingAddress);
    if (validation.data.shippingAddress)
        createData.shippingAddress = JSON.stringify(validation.data.shippingAddress);
    const customer = await index_1.prisma.customer.create({
        data: createData,
    });
    // Create opening balance ledger entry if > 0
    if (validation.data.openingBalance && validation.data.openingBalance > 0) {
        await index_1.prisma.customerLedgerEntry.create({
            data: {
                shopId,
                customerId: customer.id,
                entryType: constants_1.LedgerEntryType.DEBIT,
                referenceType: constants_1.ReferenceType.OPENING_BALANCE,
                referenceId: customer.id,
                debit: (0, utils_1.toMinorUnits)(validation.data.openingBalance),
                credit: 0,
                balanceAfter: (0, utils_1.toMinorUnits)(validation.data.openingBalance),
                description: 'Opening balance',
            },
        });
    }
    (0, requestLogger_1.logCreate)(req, 'Customer', customer.id, validation.data);
    res.status(201).json({ success: true, data: { customer } });
}));
// ============================================
// Update Customer
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('MANAGE_CUSTOMERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const validation = validators_1.updateCustomerSchema.safeParse(req.body);
    if (!validation.success)
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    const customer = await index_1.prisma.customer.findFirst({ where: { id, shopId } });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    if (validation.data.businessName && validation.data.businessName !== customer.businessName) {
        const existing = await index_1.prisma.customer.findFirst({ where: { shopId, businessName: validation.data.businessName, id: { not: id } } });
        if (existing)
            throw new errorHandler_1.ConflictError('Customer business name already exists');
    }
    const updateData = { ...validation.data };
    // Convert address objects to JSON strings
    if (validation.data.billingAddress)
        updateData.billingAddress = JSON.stringify(validation.data.billingAddress);
    if (validation.data.shippingAddress)
        updateData.shippingAddress = JSON.stringify(validation.data.shippingAddress);
    const updatedCustomer = await index_1.prisma.customer.update({
        where: { id },
        data: updateData,
    });
    (0, requestLogger_1.logUpdate)(req, 'Customer', id, {}, validation.data);
    res.json({ success: true, data: { customer: updatedCustomer } });
}));
// ============================================
// Delete Customer
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_CUSTOMERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const customer = await index_1.prisma.customer.findFirst({
        where: { id, shopId },
        include: { _count: { select: { salesInvoices: true, payments: true, ledgerEntries: true, creditNotes: true } } },
    });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    if (customer._count.salesInvoices > 0 || customer._count.payments > 0 || customer._count.ledgerEntries > 0 || customer._count.creditNotes > 0) {
        throw new errorHandler_1.ValidationError('Cannot delete customer with transaction history. Deactivate instead.');
    }
    await index_1.prisma.customer.delete({ where: { id } });
    (0, requestLogger_1.logDelete)(req, 'Customer', id, {});
    res.json({ success: true, data: { message: 'Customer deleted successfully' } });
}));
// ============================================
// Record Customer Payment
// ============================================
router.post('/:id/payments', (0, auth_1.requirePermission)('MANAGE_PAYMENTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount, method, paidAt, referenceNumber, notes, invoiceId } = req.body;
    const customer = await index_1.prisma.customer.findFirst({ where: { id, shopId } });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    const paymentAmount = (0, utils_1.toMinorUnits)(amount);
    if (paymentAmount <= 0)
        throw new errorHandler_1.ValidationError('Payment amount must be positive');
    const payment = await index_1.prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
            data: {
                shopId,
                partyType: constants_1.PartyType.CUSTOMER,
                partyId: id,
                referenceType: invoiceId ? constants_1.ReferenceType.SALE : constants_1.ReferenceType.PAYMENT,
                referenceId: invoiceId || id,
                amount: paymentAmount,
                method,
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                referenceNumber,
                notes,
                createdBy: userId,
            },
        });
        // Update customer balance
        await tx.customer.update({
            where: { id },
            data: { currentBalance: { decrement: paymentAmount } },
        });
        // Create ledger entry
        await tx.customerLedgerEntry.create({
            data: {
                shopId,
                customerId: id,
                entryType: constants_1.LedgerEntryType.CREDIT,
                referenceType: invoiceId ? constants_1.ReferenceType.PAYMENT : constants_1.ReferenceType.SALE,
                referenceId: created.id,
                debit: 0,
                credit: paymentAmount,
                balanceAfter: customer.currentBalance - paymentAmount,
                description: `Payment ${invoiceId ? `for invoice ${invoiceId}` : 'received'}`,
            },
        });
        // If payment is for specific invoice, update invoice
        if (invoiceId) {
            const invoice = await tx.salesInvoice.findUnique({ where: { id: invoiceId, shopId }, select: { amountPaid: true, grandTotal: true } });
            if (invoice) {
                const newAmountPaid = invoice.amountPaid + paymentAmount;
                let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
                if (newAmountPaid >= invoice.grandTotal)
                    newPaymentStatus = constants_1.PaymentStatus.PAID;
                else if (newAmountPaid === 0)
                    newPaymentStatus = constants_1.PaymentStatus.UNPAID;
                await tx.salesInvoice.update({
                    where: { id: invoiceId },
                    data: { amountPaid: newAmountPaid, balanceDue: invoice.grandTotal - newAmountPaid, paymentStatus: newPaymentStatus },
                });
            }
        }
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'Payment', payment.id, { customerId: id, amount });
    res.status(201).json({ success: true, data: { payment: { ...payment, amountFormatted: (0, utils_1.formatCurrency)(payment.amount) } } });
}));
// ============================================
// Create Credit Note
// ============================================
router.post('/:id/credit-notes', (0, auth_1.requirePermission)('MANAGE_CUSTOMERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { invoiceId, amount, reason } = req.body;
    const customer = await index_1.prisma.customer.findFirst({ where: { id, shopId } });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    const invoice = await index_1.prisma.salesInvoice.findUnique({ where: { id: invoiceId, shopId, customerId: id } });
    if (!invoice)
        throw new errorHandler_1.NotFoundError('Invoice');
    if (invoice.status === constants_1.InvoiceStatus.CANCELLED || invoice.status === constants_1.InvoiceStatus.REFUNDED) {
        throw new errorHandler_1.ValidationError('Cannot create credit note for cancelled/refunded invoice');
    }
    const creditAmount = (0, utils_1.toMinorUnits)(amount);
    if (creditAmount <= 0 || creditAmount > invoice.balanceDue) {
        throw new errorHandler_1.ValidationError('Invalid credit amount');
    }
    const creditNote = await index_1.prisma.$transaction(async (tx) => {
        const created = await tx.creditNote.create({
            data: {
                shopId,
                invoiceId,
                customerId: id,
                amount: creditAmount,
                reason,
                createdBy: userId,
            },
        });
        // Update invoice balance
        const newBalanceDue = invoice.balanceDue - creditAmount;
        let newPaymentStatus = constants_1.PaymentStatus.PARTIALLY_PAID;
        if (newBalanceDue <= 0)
            newPaymentStatus = constants_1.PaymentStatus.PAID;
        else if (invoice.amountPaid === 0)
            newPaymentStatus = constants_1.PaymentStatus.UNPAID;
        await tx.salesInvoice.update({
            where: { id: invoiceId },
            data: { balanceDue: newBalanceDue, paymentStatus: newPaymentStatus },
        });
        // Update customer balance
        await tx.customer.update({
            where: { id },
            data: { currentBalance: { decrement: creditAmount } },
        });
        // Create ledger entry
        await tx.customerLedgerEntry.create({
            data: {
                shopId,
                customerId: id,
                entryType: constants_1.LedgerEntryType.CREDIT,
                referenceType: constants_1.ReferenceType.CREDIT_NOTE,
                referenceId: created.id,
                debit: 0,
                credit: creditAmount,
                balanceAfter: customer.currentBalance - creditAmount,
                description: `Credit note: ${reason}`,
            },
        });
        return created;
    });
    (0, requestLogger_1.logCreate)(req, 'CreditNote', creditNote.id, { customerId: id, invoiceId, amount });
    res.status(201).json({ success: true, data: { creditNote: { ...creditNote, amountFormatted: (0, utils_1.formatCurrency)(creditNote.amount) } } });
}));
// ============================================
// Get Customer Ledger
// ============================================
router.get('/:id/ledger', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    const customer = await index_1.prisma.customer.findFirst({ where: { id, shopId } });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    const where = { shopId, customerId: id };
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate)
            where.createdAt.gte = new Date(startDate);
        if (endDate)
            where.createdAt.lte = new Date(endDate);
    }
    const [entries, total] = await Promise.all([
        index_1.prisma.customerLedgerEntry.findMany({
            where,
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        }),
        index_1.prisma.customerLedgerEntry.count({ where }),
    ]);
    res.json({
        success: true,
        data: { entries: entries.map(e => ({ ...e, debitFormatted: (0, utils_1.formatCurrency)(e.debit), creditFormatted: (0, utils_1.formatCurrency)(e.credit), balanceAfterFormatted: (0, utils_1.formatCurrency)(e.balanceAfter) })) },
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
}));
// ============================================
// Get Customer Statement (PDF-ready)
// ============================================
router.get('/:id/statement', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const customer = await index_1.prisma.customer.findFirst({
        where: { id, shopId },
        include: {
            salesInvoices: {
                where: {
                    ...(startDate && { invoiceDate: { gte: new Date(startDate) } }),
                    ...(endDate && { invoiceDate: { lte: new Date(endDate) } }),
                },
                orderBy: { invoiceDate: 'asc' },
                include: { items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true, lineTotal: true } } },
            },
            payments: {
                where: {
                    ...(startDate && { paidAt: { gte: new Date(startDate) } }),
                    ...(endDate && { paidAt: { lte: new Date(endDate) } }),
                },
                orderBy: { paidAt: 'asc' },
            },
            creditNotes: {
                where: {
                    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
                    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
    if (!customer)
        throw new errorHandler_1.NotFoundError('Customer');
    // Build statement entries
    const entries = [
        ...customer.salesInvoices.map(i => ({
            date: i.invoiceDate,
            type: 'INVOICE',
            reference: i.invoiceNumber,
            description: `Invoice ${i.invoiceNumber}`,
            debit: i.grandTotal,
            credit: 0,
        })),
        ...customer.payments.map(p => ({
            date: p.paidAt,
            type: 'PAYMENT',
            reference: p.referenceNumber || p.id,
            description: `Payment received (${p.method})`,
            debit: 0,
            credit: p.amount,
        })),
        ...customer.creditNotes.map(c => ({
            date: c.createdAt,
            type: 'CREDIT_NOTE',
            reference: c.id,
            description: `Credit note: ${c.reason}`,
            debit: 0,
            credit: c.amount,
        })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Calculate running balance
    let runningBalance = customer.openingBalance;
    const statement = entries.map(e => {
        runningBalance += e.debit - e.credit;
        return { ...e, balance: runningBalance };
    });
    res.json({
        success: true,
        data: {
            statement: {
                customer: { id: customer.id, businessName: customer.businessName, phone: customer.phone, email: customer.email },
                openingBalance: customer.openingBalance,
                entries: statement.map(e => ({ ...e, debitFormatted: (0, utils_1.formatCurrency)(e.debit), creditFormatted: (0, utils_1.formatCurrency)(e.credit), balanceFormatted: (0, utils_1.formatCurrency)(e.balance) })),
                closingBalance: runningBalance,
                totalInvoiced: customer.salesInvoices.reduce((sum, i) => sum + i.grandTotal, 0),
                totalPaid: customer.payments.reduce((sum, p) => sum + p.amount, 0),
                totalCreditNotes: customer.creditNotes.reduce((sum, c) => sum + c.amount, 0),
            },
        },
    });
}));
exports.default = router;
//# sourceMappingURL=customer.js.map