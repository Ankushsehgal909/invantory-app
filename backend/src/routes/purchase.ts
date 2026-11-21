/**
 * Purchase Routes
 * Purchase/refill management with stock updates
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError, BusinessLogicError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { createPurchaseSchema } from '@shopstock/shared/validators';
import { PaymentStatus, InvoiceStatus, MovementType, ReferenceType, PartyType, LedgerEntryType } from '@shopstock/shared/constants';
import { logCreate, logUpdate } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits, generateInvoiceNumber } from '@shopstock/shared/utils';

const router = Router();

// ============================================
// List Purchases
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 20, search, supplierId, startDate, endDate, paymentStatus, sortBy = 'purchaseDate', sortOrder = 'desc' } = req.query;

  const where: any = { shopId };

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { supplierInvoiceNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (supplierId) where.supplierId = supplierId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    where.purchaseDate = {};
    if (startDate) where.purchaseDate.gte = new Date(startDate as string);
    if (endDate) where.purchaseDate.lte = new Date(endDate as string);
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
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
    prisma.purchase.count({ where }),
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

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const purchase = await prisma.purchase.findFirst({
    where: { id, shopId },
    include: {
      supplier: { select: { id: true, name: true, phone: true, email: true, address: true } },
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
    },
  });

  if (!purchase) {
    throw new NotFoundError('Purchase');
  }

  res.json({
    success: true,
    data: {
      purchase: {
        ...purchase,
        subtotalFormatted: formatCurrency(purchase.subtotal),
        discountFormatted: formatCurrency(purchase.discount),
        taxFormatted: formatCurrency(purchase.tax),
        additionalChargesFormatted: formatCurrency(purchase.additionalCharges),
        grandTotalFormatted: formatCurrency(purchase.grandTotal),
        amountPaidFormatted: formatCurrency(purchase.amountPaid),
        balanceDueFormatted: formatCurrency(purchase.balanceDue),
        items: purchase.items.map(item => ({
          ...item,
          unitCostFormatted: formatCurrency(item.unitCost),
          discountFormatted: formatCurrency(item.discount),
          taxFormatted: formatCurrency(item.tax),
          lineTotalFormatted: formatCurrency(item.lineTotal),
        })),
        payments: purchase.payments.map(p => ({
          ...p,
          amountFormatted: formatCurrency(p.amount),
        })),
      },
    },
  });
}));

// ============================================
// Create Purchase
// ============================================

router.post('/', requirePermission('CREATE_PURCHASE'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const validation = createPurchaseSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const { items, ...purchaseData } = validation.data;

  // Generate invoice number
  const lastPurchase = await prisma.purchase.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  const sequence = lastPurchase
    ? parseInt(lastPurchase.invoiceNumber.replace(/\D/g, '')) + 1
    : 1;

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { purchasePrefix: true } });
  const invoiceNumber = generateInvoiceNumber(shop?.purchasePrefix || 'PUR-', sequence);

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

  let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
  if (amountPaid >= grandTotal) paymentStatus = PaymentStatus.PAID;
  else if (amountPaid > 0) paymentStatus = PaymentStatus.PARTIALLY_PAID;

  // Create purchase with items in transaction
  const purchase = await prisma.$transaction(async (tx) => {
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
            unitCost: toMinorUnits(item.unitCost),
            discount: toMinorUnits(item.discount || 0),
            tax: toMinorUnits(item.tax || 0),
            lineTotal: toMinorUnits(item.quantity * item.unitCost - (item.discount || 0) + (item.tax || 0)),
          })),
        },
      },
      include: { items: true },
    });

    // Process each item: update stock, create batches, create movements
    for (const item of created.items) {
      const inputItem = items.find(i => i.productId === item.productId);
      if (!inputItem) continue;

      // Get or create batch
      let batchId = inputItem.batchId;
      if (!batchId && inputItem.batchNumber) {
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
        } else {
          // Create new batch
          const batch = await tx.batch.create({
            data: {
              productId: item.productId,
              batchNumber: inputItem.batchNumber!,
              purchaseDate: new Date(purchaseData.purchaseDate),
              expiryDate: inputItem.expiryDate ? new Date(inputItem.expiryDate) : null,
              quantityReceived: inputItem.quantity,
              quantityAvailable: inputItem.quantity,
              unitCost: toMinorUnits(inputItem.unitCost),
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
          movementType: MovementType.PURCHASE,
          quantityDelta: inputItem.quantity,
          quantityBefore: qtyBefore,
          quantityAfter: qtyAfter,
          referenceType: ReferenceType.PURCHASE,
          referenceId: created.id,
          reason: `Purchase ${created.invoiceNumber}`,
          actorId: userId,
          unitCost: toMinorUnits(inputItem.unitCost),
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
            partyType: PartyType.SUPPLIER,
            partyId: purchaseData.supplierId,
            referenceType: ReferenceType.PURCHASE,
            referenceId: created.id,
            amount: toMinorUnits(amountPaid),
            method: purchaseData.paymentMethod,
            paidAt: new Date(purchaseData.purchaseDate),
            createdBy: userId,
          },
        });
      }

      // Update supplier balance
      await tx.supplier.update({
        where: { id: purchaseData.supplierId },
        data: { currentBalance: { increment: toMinorUnits(balanceDue) } },
      });

      // Create supplier ledger entry
      await tx.supplierLedgerEntry.create({
        data: {
          shopId,
          supplierId: purchaseData.supplierId,
          entryType: LedgerEntryType.CREDIT, // We owe the supplier
          referenceType: ReferenceType.PURCHASE,
          referenceId: created.id,
          debit: 0,
          credit: toMinorUnits(grandTotal),
          balanceAfter: toMinorUnits(grandTotal), // This would need to be calculated properly
          description: `Purchase ${invoiceNumber}`,
        },
      });
    }

    return created;
  });

  logCreate(req, 'Purchase', purchase.id, validation.data);

  res.status(201).json({
    success: true,
    data: {
      purchase: {
        ...purchase,
        subtotalFormatted: formatCurrency(purchase.subtotal),
        discountFormatted: formatCurrency(purchase.discount),
        taxFormatted: formatCurrency(purchase.tax),
        additionalChargesFormatted: formatCurrency(purchase.additionalCharges),
        grandTotalFormatted: formatCurrency(purchase.grandTotal),
        amountPaidFormatted: formatCurrency(purchase.amountPaid),
        balanceDueFormatted: formatCurrency(purchase.balanceDue),
      },
    },
  });
}));

// ============================================
// Update Purchase
// ============================================

router.put('/:id', requirePermission('EDIT_PURCHASE'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const purchase = await prisma.purchase.findFirst({
    where: { id, shopId },
  });

  if (!purchase) {
    throw new NotFoundError('Purchase');
  }

  if (purchase.status === InvoiceStatus.CANCELLED) {
    throw new BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Cannot edit cancelled purchase');
  }

  // For now, only allow updating notes, payment status, etc.
  // Full item editing would require complex stock reversal
  const { notes, paymentStatus, amountPaid, paymentMethod } = req.body;

  const updateData: any = {};
  if (notes !== undefined) updateData.notes = notes;
  if (paymentStatus) updateData.paymentStatus = paymentStatus;

  if (amountPaid !== undefined && amountPaid !== purchase.amountPaid) {
    const newAmountPaid = toMinorUnits(amountPaid);
    const diff = newAmountPaid - purchase.amountPaid;

    updateData.amountPaid = newAmountPaid;
    updateData.balanceDue = purchase.grandTotal - newAmountPaid;

    if (newAmountPaid >= purchase.grandTotal) updateData.paymentStatus = PaymentStatus.PAID;
    else if (newAmountPaid > 0) updateData.paymentStatus = PaymentStatus.PARTIALLY_PAID;
    else updateData.paymentStatus = PaymentStatus.UNPAID;

    // Create payment record for additional payment
    if (diff > 0 && paymentMethod) {
      await prisma.payment.create({
        data: {
          shopId,
          partyType: PartyType.SUPPLIER,
          partyId: purchase.supplierId!,
          referenceType: ReferenceType.PURCHASE,
          referenceId: id,
          amount: diff,
          method: paymentMethod,
          paidAt: new Date(),
          createdBy: (req as any).user?.id,
        },
      });
    }
  }

  const updatedPurchase = await prisma.purchase.update({
    where: { id },
    data: updateData,
  });

  logUpdate(req, 'Purchase', id, {}, updateData);

  res.json({
    success: true,
    data: { purchase: updatedPurchase },
  });
}));

// ============================================
// Cancel Purchase
// ============================================

router.post('/:id/cancel', requirePermission('DELETE_PURCHASE'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { reason } = req.body;

  const purchase = await prisma.purchase.findFirst({
    where: { id, shopId },
    include: { items: { include: { batch: true } } },
  });

  if (!purchase) {
    throw new NotFoundError('Purchase');
  }

  if (purchase.status === InvoiceStatus.CANCELLED) {
    throw new BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Purchase already cancelled');
  }

  await prisma.$transaction(async (tx) => {
    // Reverse stock for each item
    for (const item of purchase.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { currentStock: true } });
      const qtyBefore = product?.currentStock || 0;
      const qtyAfter = qtyBefore - item.quantity;

      if (qtyAfter < 0) {
        throw new BusinessLogicError('NEGATIVE_STOCK_NOT_ALLOWED', `Insufficient stock to cancel purchase for product ${item.productId}`);
      }

      // Create reversal movement
      await tx.stockMovement.create({
        data: {
          shopId,
          productId: item.productId,
          batchId: item.batchId,
          movementType: MovementType.PURCHASE_RETURN,
          quantityDelta: -item.quantity,
          quantityBefore: qtyBefore,
          quantityAfter: qtyAfter,
          referenceType: ReferenceType.PURCHASE,
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
      data: { status: InvoiceStatus.CANCELLED, balanceDue: 0, amountPaid: 0, paymentStatus: PaymentStatus.UNPAID },
    });

    // Update supplier balance
    if (purchase.supplierId) {
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { currentBalance: { decrement: purchase.grandTotal } },
      });
    }
  });

  logUpdate(req, 'Purchase', id, { status: purchase.status }, { status: InvoiceStatus.CANCELLED, reason });

  res.json({ success: true, data: { message: 'Purchase cancelled successfully' } });
}));

export default router;