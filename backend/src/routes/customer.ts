/**
 * Customer Routes
 * Customer CRUD, ledger, payments, credit notes
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { createCustomerSchema, updateCustomerSchema } from '@shopstock/shared/validators';
import { logCreate, logUpdate, logDelete } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';
import { PartyType, ReferenceType, LedgerEntryType, PaymentStatus, PaymentMethod, InvoiceStatus } from '@shopstock/shared/constants';

const router = Router();

// ============================================
// List Customers
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 50, search, isActive } = req.query;

  const where: any = { shopId };
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { _count: { select: { salesInvoices: true, payments: true } } },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { businessName: 'asc' },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    success: true,
    data: { customers: customers.map(c => ({
      ...c,
      openingBalanceFormatted: formatCurrency(c.openingBalance),
      currentBalanceFormatted: formatCurrency(c.currentBalance),
    })) },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Get Customer by ID
// ============================================

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { id, shopId },
    include: {
      salesInvoices: { take: 10, orderBy: { invoiceDate: 'desc' }, include: { _count: { select: { items: true } } } },
      payments: { take: 10, orderBy: { paidAt: 'desc' } },
      ledgerEntries: { take: 20, orderBy: { createdAt: 'desc' } },
      creditNotes: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!customer) throw new NotFoundError('Customer');

  res.json({
    success: true,
    data: {
      customer: {
        ...customer,
        openingBalanceFormatted: formatCurrency(customer.openingBalance),
        currentBalanceFormatted: formatCurrency(customer.currentBalance),
        salesInvoices: customer.salesInvoices.map(i => ({ ...i, grandTotalFormatted: formatCurrency(i.grandTotal) })),
        payments: customer.payments.map(p => ({ ...p, amountFormatted: formatCurrency(p.amount) })),
        ledgerEntries: customer.ledgerEntries.map(e => ({ ...e, debitFormatted: formatCurrency(e.debit), creditFormatted: formatCurrency(e.credit), balanceAfterFormatted: formatCurrency(e.balanceAfter) })),
        creditNotes: customer.creditNotes.map(c => ({ ...c, amountFormatted: formatCurrency(c.amount) })),
      },
    },
  });
}));

// ============================================
// Create Customer
// ============================================

router.post('/', requirePermission('MANAGE_CUSTOMERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const validation = createCustomerSchema.safeParse(req.body);

  if (!validation.success) throw new ValidationError('Invalid input', { errors: validation.error.errors });

  const existing = await prisma.customer.findFirst({ where: { shopId, businessName: validation.data.businessName } });
  if (existing) throw new ConflictError('Customer business name already exists');

  const customer = await prisma.customer.create({
    data: { ...validation.data, shopId, openingBalance: toMinorUnits(validation.data.openingBalance || 0) },
  });

  // Create opening balance ledger entry if > 0
  if (validation.data.openingBalance && validation.data.openingBalance > 0) {
    await prisma.customerLedgerEntry.create({
      data: {
        shopId,
        customerId: customer.id,
        entryType: LedgerEntryType.DEBIT,
        referenceType: ReferenceType.OPENING_BALANCE,
        referenceId: customer.id,
        debit: toMinorUnits(validation.data.openingBalance),
        credit: 0,
        balanceAfter: toMinorUnits(validation.data.openingBalance),
        description: 'Opening balance',
      },
    });
  }

  logCreate(req, 'Customer', customer.id, validation.data);

  res.status(201).json({ success: true, data: { customer } });
}));

// ============================================
// Update Customer
// ============================================

router.put('/:id', requirePermission('MANAGE_CUSTOMERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const validation = updateCustomerSchema.safeParse(req.body);

  if (!validation.success) throw new ValidationError('Invalid input', { errors: validation.error.errors });

  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new NotFoundError('Customer');

  if (validation.data.businessName && validation.data.businessName !== customer.businessName) {
    const existing = await prisma.customer.findFirst({ where: { shopId, businessName: validation.data.businessName, id: { not: id } } });
    if (existing) throw new ConflictError('Customer business name already exists');
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: validation.data,
  });

  logUpdate(req, 'Customer', id, {}, validation.data);

  res.json({ success: true, data: { customer: updatedCustomer } });
}));

// ============================================
// Delete Customer
// ============================================

router.delete('/:id', requirePermission('MANAGE_CUSTOMERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { id, shopId },
    include: { _count: { select: { salesInvoices: true, payments: true, ledgerEntries: true, creditNotes: true } } },
  });

  if (!customer) throw new NotFoundError('Customer');

  if (customer._count.salesInvoices > 0 || customer._count.payments > 0 || customer._count.ledgerEntries > 0 || customer._count.creditNotes > 0) {
    throw new ValidationError('Cannot delete customer with transaction history. Deactivate instead.');
  }

  await prisma.customer.delete({ where: { id } });

  logDelete(req, 'Customer', id, {});

  res.json({ success: true, data: { message: 'Customer deleted successfully' } });
}));

// ============================================
// Record Customer Payment
// ============================================

router.post('/:id/payments', requirePermission('MANAGE_PAYMENTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { amount, method, paidAt, referenceNumber, notes, invoiceId } = req.body;

  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new NotFoundError('Customer');

  const paymentAmount = toMinorUnits(amount);
  if (paymentAmount <= 0) throw new ValidationError('Payment amount must be positive');

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        shopId,
        partyType: PartyType.CUSTOMER,
        partyId: id,
        referenceType: invoiceId ? ReferenceType.SALE : ReferenceType.PAYMENT,
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
        entryType: LedgerEntryType.CREDIT,
        referenceType: invoiceId ? ReferenceType.PAYMENT : ReferenceType.SALE,
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
        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= invoice.grandTotal) newPaymentStatus = PaymentStatus.PAID;
        else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

        await tx.salesInvoice.update({
          where: { id: invoiceId },
          data: { amountPaid: newAmountPaid, balanceDue: invoice.grandTotal - newAmountPaid, paymentStatus: newPaymentStatus },
        });
      }
    }

    return created;
  });

  logCreate(req, 'Payment', payment.id, { customerId: id, amount });

  res.status(201).json({ success: true, data: { payment: { ...payment, amountFormatted: formatCurrency(payment.amount) } } });
}));

// ============================================
// Create Credit Note
// ============================================

router.post('/:id/credit-notes', requirePermission('MANAGE_CUSTOMERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { invoiceId, amount, reason } = req.body;

  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new NotFoundError('Customer');

  const invoice = await prisma.salesInvoice.findUnique({ where: { id: invoiceId, shopId, customerId: id } });
  if (!invoice) throw new NotFoundError('Invoice');

  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
    throw new ValidationError('Cannot create credit note for cancelled/refunded invoice');
  }

  const creditAmount = toMinorUnits(amount);
  if (creditAmount <= 0 || creditAmount > invoice.balanceDue) {
    throw new ValidationError('Invalid credit amount');
  }

  const creditNote = await prisma.$transaction(async (tx) => {
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
    let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
    if (newBalanceDue <= 0) newPaymentStatus = PaymentStatus.PAID;
    else if (invoice.amountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

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
        entryType: LedgerEntryType.CREDIT,
        referenceType: ReferenceType.CREDIT_NOTE,
        referenceId: created.id,
        debit: 0,
        credit: creditAmount,
        balanceAfter: customer.currentBalance - creditAmount,
        description: `Credit note: ${reason}`,
      },
    });

    return created;
  });

  logCreate(req, 'CreditNote', creditNote.id, { customerId: id, invoiceId, amount });

  res.status(201).json({ success: true, data: { creditNote: { ...creditNote, amountFormatted: formatCurrency(creditNote.amount) } } });
}));

// ============================================
// Get Customer Ledger
// ============================================

router.get('/:id/ledger', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const { page = 1, limit = 50, startDate, endDate } = req.query;

  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new NotFoundError('Customer');

  const where: any = { shopId, customerId: id };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const [entries, total] = await Promise.all([
    prisma.customerLedgerEntry.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customerLedgerEntry.count({ where }),
  ]);

  res.json({
    success: true,
    data: { entries: entries.map(e => ({ ...e, debitFormatted: formatCurrency(e.debit), creditFormatted: formatCurrency(e.credit), balanceAfterFormatted: formatCurrency(e.balanceAfter) })) },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Get Customer Statement (PDF-ready)
// ============================================

router.get('/:id/statement', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  const customer = await prisma.customer.findFirst({
    where: { id, shopId },
    include: {
      salesInvoices: {
        where: {
          ...(startDate && { invoiceDate: { gte: new Date(startDate as string) } }),
          ...(endDate && { invoiceDate: { lte: new Date(endDate as string) } }),
        },
        orderBy: { invoiceDate: 'asc' },
        include: { items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true, lineTotal: true } } },
      },
      payments: {
        where: {
          ...(startDate && { paidAt: { gte: new Date(startDate as string) } }),
          ...(endDate && { paidAt: { lte: new Date(endDate as string) } }),
        },
        orderBy: { paidAt: 'asc' },
      },
      creditNotes: {
        where: {
          ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
          ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!customer) throw new NotFoundError('Customer');

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
        entries: statement.map(e => ({ ...e, debitFormatted: formatCurrency(e.debit), creditFormatted: formatCurrency(e.credit), balanceFormatted: formatCurrency(e.balance) })),
        closingBalance: runningBalance,
        totalInvoiced: customer.salesInvoices.reduce((sum, i) => sum + i.grandTotal, 0),
        totalPaid: customer.payments.reduce((sum, p) => sum + p.amount, 0),
        totalCreditNotes: customer.creditNotes.reduce((sum, c) => sum + c.amount, 0),
      },
    },
  });
}));

export default router;