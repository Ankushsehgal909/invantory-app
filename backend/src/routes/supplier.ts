/**
 * Supplier Routes
 * Supplier CRUD, ledger, payments
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { createSupplierSchema, updateSupplierSchema } from '@shopstock/shared/validators';
import { logCreate, logUpdate, logDelete } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';
import { PartyType, ReferenceType, LedgerEntryType, PaymentStatus, PaymentMethod } from '@shopstock/shared/constants';

const router = Router();

// ============================================
// List Suppliers
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 50, search, isActive } = req.query;

  const where: any = { shopId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { purchases: true, payments: true } } },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.count({ where }),
  ]);

  res.json({
    success: true,
    data: { suppliers: suppliers.map(s => ({
      ...s,
      openingBalanceFormatted: formatCurrency(s.openingBalance),
      currentBalanceFormatted: formatCurrency(s.currentBalance),
    })) },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Get Supplier by ID
// ============================================

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, shopId },
    include: {
      purchases: { take: 10, orderBy: { purchaseDate: 'desc' }, include: { _count: { select: { items: true } } } },
      payments: { take: 10, orderBy: { paidAt: 'desc' } },
      ledgerEntries: { take: 20, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!supplier) throw new NotFoundError('Supplier');

  res.json({
    success: true,
    data: {
      supplier: {
        ...supplier,
        openingBalanceFormatted: formatCurrency(supplier.openingBalance),
        currentBalanceFormatted: formatCurrency(supplier.currentBalance),
        purchases: supplier.purchases.map(p => ({ ...p, grandTotalFormatted: formatCurrency(p.grandTotal) })),
        payments: supplier.payments.map(p => ({ ...p, amountFormatted: formatCurrency(p.amount) })),
        ledgerEntries: supplier.ledgerEntries.map(e => ({ ...e, debitFormatted: formatCurrency(e.debit), creditFormatted: formatCurrency(e.credit), balanceAfterFormatted: formatCurrency(e.balanceAfter) })),
      },
    },
  });
}));

// ============================================
// Create Supplier
// ============================================

router.post('/', requirePermission('MANAGE_SUPPLIERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const validation = createSupplierSchema.safeParse(req.body);

  if (!validation.success) throw new ValidationError('Invalid input', { errors: validation.error.errors });

  const existing = await prisma.supplier.findFirst({ where: { shopId, name: validation.data.name } });
  if (existing) throw new ConflictError('Supplier name already exists');

  const supplier = await prisma.supplier.create({
    data: { ...validation.data, shopId, openingBalance: toMinorUnits(validation.data.openingBalance || 0) },
  });

  // Create opening balance ledger entry if > 0
  if (validation.data.openingBalance && validation.data.openingBalance > 0) {
    await prisma.supplierLedgerEntry.create({
      data: {
        shopId,
        supplierId: supplier.id,
        entryType: LedgerEntryType.CREDIT,
        referenceType: ReferenceType.OPENING_BALANCE,
        referenceId: supplier.id,
        debit: 0,
        credit: toMinorUnits(validation.data.openingBalance),
        balanceAfter: toMinorUnits(validation.data.openingBalance),
        description: 'Opening balance',
      },
    });
  }

  logCreate(req, 'Supplier', supplier.id, validation.data);

  res.status(201).json({ success: true, data: { supplier } });
}));

// ============================================
// Update Supplier
// ============================================

router.put('/:id', requirePermission('MANAGE_SUPPLIERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const validation = updateSupplierSchema.safeParse(req.body);

  if (!validation.success) throw new ValidationError('Invalid input', { errors: validation.error.errors });

  const supplier = await prisma.supplier.findFirst({ where: { id, shopId } });
  if (!supplier) throw new NotFoundError('Supplier');

  if (validation.data.name && validation.data.name !== supplier.name) {
    const existing = await prisma.supplier.findFirst({ where: { shopId, name: validation.data.name, id: { not: id } } });
    if (existing) throw new ConflictError('Supplier name already exists');
  }

  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data: validation.data,
  });

  logUpdate(req, 'Supplier', id, {}, validation.data);

  res.json({ success: true, data: { supplier: updatedSupplier } });
}));

// ============================================
// Delete Supplier
// ============================================

router.delete('/:id', requirePermission('MANAGE_SUPPLIERS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, shopId },
    include: { _count: { select: { purchases: true, payments: true, ledgerEntries: true } } },
  });

  if (!supplier) throw new NotFoundError('Supplier');

  if (supplier._count.purchases > 0 || supplier._count.payments > 0 || supplier._count.ledgerEntries > 0) {
    throw new ValidationError('Cannot delete supplier with transaction history. Deactivate instead.');
  }

  await prisma.supplier.delete({ where: { id } });

  logDelete(req, 'Supplier', id, {});

  res.json({ success: true, data: { message: 'Supplier deleted successfully' } });
}));

// ============================================
// Record Supplier Payment
// ============================================

router.post('/:id/payments', requirePermission('MANAGE_PAYMENTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { amount, method, paidAt, referenceNumber, notes, purchaseId } = req.body;

  const supplier = await prisma.supplier.findFirst({ where: { id, shopId } });
  if (!supplier) throw new NotFoundError('Supplier');

  const paymentAmount = toMinorUnits(amount);
  if (paymentAmount <= 0) throw new ValidationError('Payment amount must be positive');

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        shopId,
        partyType: PartyType.SUPPLIER,
        partyId: id,
        referenceType: purchaseId ? ReferenceType.PURCHASE : ReferenceType.PAYMENT,
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
        entryType: LedgerEntryType.DEBIT,
        referenceType: purchaseId ? ReferenceType.PAYMENT : ReferenceType.PURCHASE,
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
        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= purchase.grandTotal) newPaymentStatus = PaymentStatus.PAID;
        else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

        await tx.purchase.update({
          where: { id: purchaseId },
          data: { amountPaid: newAmountPaid, balanceDue: purchase.grandTotal - newAmountPaid, paymentStatus: newPaymentStatus },
        });
      }
    }

    return created;
  });

  logCreate(req, 'Payment', payment.id, { supplierId: id, amount });

  res.status(201).json({ success: true, data: { payment: { ...payment, amountFormatted: formatCurrency(payment.amount) } } });
}));

// ============================================
// Get Supplier Ledger
// ============================================

router.get('/:id/ledger', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const { page = 1, limit = 50, startDate, endDate } = req.query;

  const supplier = await prisma.supplier.findFirst({ where: { id, shopId } });
  if (!supplier) throw new NotFoundError('Supplier');

  const where: any = { shopId, supplierId: id };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const [entries, total] = await Promise.all([
    prisma.supplierLedgerEntry.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierLedgerEntry.count({ where }),
  ]);

  res.json({
    success: true,
    data: { entries: entries.map(e => ({ ...e, debitFormatted: formatCurrency(e.debit), creditFormatted: formatCurrency(e.credit), balanceAfterFormatted: formatCurrency(e.balanceAfter) })) },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

export default router;