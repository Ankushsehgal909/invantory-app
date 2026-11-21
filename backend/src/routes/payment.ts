/**
 * Payment Routes
 * Payment management across purchases and sales
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { logCreate } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';
import { PartyType, ReferenceType, PaymentMethod, PaymentStatus } from '@shopstock/shared/constants';

const router = Router();

// ============================================
// List Payments
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 50, partyType, partyId, referenceType, referenceId, method, startDate, endDate } = req.query;

  const where: any = { shopId };
  if (partyType) where.partyType = partyType;
  if (partyId) where.partyId = partyId;
  if (referenceType) where.referenceType = referenceType;
  if (referenceId) where.referenceId = referenceId;
  if (method) where.method = method;

  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = new Date(startDate as string);
    if (endDate) where.paidAt.lte = new Date(endDate as string);
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
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
    prisma.payment.count({ where }),
  ]);

  res.json({
    success: true,
    data: { payments: payments.map(p => ({ ...p, amountFormatted: formatCurrency(p.amount) })) },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Get Payment by ID
// ============================================

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const payment = await prisma.payment.findFirst({
    where: { id, shopId },
    include: {
      customer: { select: { id: true, businessName: true, phone: true } },
      supplier: { select: { id: true, name: true, phone: true } },
      purchase: { select: { id: true, invoiceNumber: true, grandTotal: true, amountPaid: true, balanceDue: true } },
      salesInvoice: { select: { id: true, invoiceNumber: true, grandTotal: true, amountPaid: true, balanceDue: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  if (!payment) throw new NotFoundError('Payment');

  res.json({
    success: true,
    data: { payment: { ...payment, amountFormatted: formatCurrency(payment.amount) } },
  });
}));

// ============================================
// Create Payment (Generic)
// ============================================

router.post('/', requirePermission('MANAGE_PAYMENTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { partyType, partyId, referenceType, referenceId, amount, method, paidAt, referenceNumber, notes } = req.body;

  if (!partyType || !partyId || !referenceType || !referenceId || !amount || !method) {
    throw new ValidationError('Required fields: partyType, partyId, referenceType, referenceId, amount, method');
  }

  const paymentAmount = toMinorUnits(amount);
  if (paymentAmount <= 0) throw new ValidationError('Payment amount must be positive');

  // Verify party exists
  if (partyType === PartyType.CUSTOMER) {
    const customer = await prisma.customer.findFirst({ where: { id: partyId, shopId } });
    if (!customer) throw new NotFoundError('Customer');
  } else if (partyType === PartyType.SUPPLIER) {
    const supplier = await prisma.supplier.findFirst({ where: { id: partyId, shopId } });
    if (!supplier) throw new NotFoundError('Supplier');
  }

  // Verify reference exists
  if (referenceType === ReferenceType.SALE) {
    const invoice = await prisma.salesInvoice.findFirst({ where: { id: referenceId, shopId } });
    if (!invoice) throw new NotFoundError('Sales Invoice');
    if (paymentAmount > invoice.balanceDue) throw new ValidationError('Payment exceeds balance due');
  } else if (referenceType === ReferenceType.PURCHASE) {
    const purchase = await prisma.purchase.findFirst({ where: { id: referenceId, shopId } });
    if (!purchase) throw new NotFoundError('Purchase');
    if (paymentAmount > purchase.balanceDue) throw new ValidationError('Payment exceeds balance due');
  }

  const payment = await prisma.$transaction(async (tx) => {
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
    if (partyType === PartyType.CUSTOMER && referenceType === ReferenceType.SALE) {
      const invoice = await tx.salesInvoice.findUnique({ where: { id: referenceId } });
      if (invoice) {
        const newAmountPaid = invoice.amountPaid + paymentAmount;
        const newBalanceDue = invoice.grandTotal - newAmountPaid;
        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= invoice.grandTotal) newPaymentStatus = PaymentStatus.PAID;
        else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

        await tx.salesInvoice.update({ where: { id: referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
        await tx.customer.update({ where: { id: partyId }, data: { currentBalance: { decrement: paymentAmount } } });
        await tx.customerLedgerEntry.create({
          data: { shopId, customerId: partyId, entryType: 'CREDIT', referenceType: ReferenceType.PAYMENT, referenceId: created.id, debit: 0, credit: paymentAmount, balanceAfter: invoice.balanceDue - paymentAmount, description: `Payment for invoice ${invoice.invoiceNumber}` },
        });
      }
    } else if (partyType === PartyType.SUPPLIER && referenceType === ReferenceType.PURCHASE) {
      const purchase = await tx.purchase.findUnique({ where: { id: referenceId } });
      if (purchase) {
        const newAmountPaid = purchase.amountPaid + paymentAmount;
        const newBalanceDue = purchase.grandTotal - newAmountPaid;
        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= purchase.grandTotal) newPaymentStatus = PaymentStatus.PAID;
        else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

        await tx.purchase.update({ where: { id: referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
        await tx.supplier.update({ where: { id: partyId }, data: { currentBalance: { decrement: paymentAmount } } });
        await tx.supplierLedgerEntry.create({
          data: { shopId, supplierId: partyId, entryType: 'DEBIT', referenceType: ReferenceType.PAYMENT, referenceId: created.id, debit: paymentAmount, credit: 0, balanceAfter: purchase.balanceDue - paymentAmount, description: `Payment for purchase ${purchase.invoiceNumber}` },
        });
      }
    }

    return created;
  });

  logCreate(req, 'Payment', payment.id, req.body);

  res.status(201).json({ success: true, data: { payment: { ...payment, amountFormatted: formatCurrency(payment.amount) } } });
}));

// ============================================
// Delete Payment (Reverse)
// ============================================

router.delete('/:id', requirePermission('MANAGE_PAYMENTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const payment = await prisma.payment.findFirst({ where: { id, shopId } });
  if (!payment) throw new NotFoundError('Payment');

  await prisma.$transaction(async (tx) => {
    // Reverse balances
    if (payment.partyType === PartyType.CUSTOMER && payment.referenceType === ReferenceType.SALE && payment.referenceId && payment.partyId) {
      const invoice = await tx.salesInvoice.findUnique({ where: { id: payment.referenceId } });
      if (invoice) {
        const newAmountPaid = invoice.amountPaid - payment.amount;
        const newBalanceDue = invoice.grandTotal - newAmountPaid;
        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= invoice.grandTotal) newPaymentStatus = PaymentStatus.PAID;
        else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

        await tx.salesInvoice.update({ where: { id: payment.referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
        await tx.customer.update({ where: { id: payment.partyId }, data: { currentBalance: { increment: payment.amount } } });
      }
    } else if (payment.partyType === PartyType.SUPPLIER && payment.referenceType === ReferenceType.PURCHASE && payment.referenceId && payment.partyId) {
      const purchase = await tx.purchase.findUnique({ where: { id: payment.referenceId } });
      if (purchase) {
        const newAmountPaid = purchase.amountPaid - payment.amount;
        const newBalanceDue = purchase.grandTotal - newAmountPaid;
        let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
        if (newAmountPaid >= purchase.grandTotal) newPaymentStatus = PaymentStatus.PAID;
        else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

        await tx.purchase.update({ where: { id: payment.referenceId }, data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus } });
        await tx.supplier.update({ where: { id: payment.partyId }, data: { currentBalance: { increment: payment.amount } } });
      }
    }

    // Delete ledger entries
    await tx.customerLedgerEntry.deleteMany({ where: { referenceType: ReferenceType.PAYMENT, referenceId: id } });
    await tx.supplierLedgerEntry.deleteMany({ where: { referenceType: ReferenceType.PAYMENT, referenceId: id } });

    // Delete payment
    await tx.payment.delete({ where: { id } });
  });

  res.json({ success: true, data: { message: 'Payment reversed successfully' } });
}));

// ============================================
// Payment Methods Reference
// ============================================

router.get('/meta/methods', asyncHandler(async (req, res) => {
  const methods = Object.values(PaymentMethod).map(m => ({ value: m, label: m }));
  res.json({ success: true, data: { methods } });
}));

export default router;