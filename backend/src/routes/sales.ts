/**
 * Sales Invoice Routes
 * Wholesale/B2B sales with discounts, payments, PDF generation
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError, BusinessLogicError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { createSalesInvoiceSchema } from '@shopstock/shared/validators';
import { PaymentStatus, InvoiceStatus, MovementType, ReferenceType, PartyType, LedgerEntryType, DiscountType } from '@shopstock/shared/constants';
import { logCreate, logUpdate } from '../middleware/requestLogger';
import { formatCurrency, toMinorUnits, generateInvoiceNumber, calculateDiscount } from '@shopstock/shared/utils';

const router = Router();

// ============================================
// List Sales Invoices
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { page = 1, limit = 20, search, customerId, startDate, endDate, paymentStatus, status, sortBy = 'invoiceDate', sortOrder = 'desc' } = req.query;

  const where: any = { shopId };

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { businessName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (customerId) where.customerId = customerId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate.gte = new Date(startDate as string);
    if (endDate) where.invoiceDate.lte = new Date(endDate as string);
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
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
    prisma.salesInvoice.count({ where }),
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

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const invoice = await prisma.salesInvoice.findFirst({
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
    throw new NotFoundError('Sales Invoice');
  }

  res.json({
    success: true,
    data: {
      invoice: {
        ...invoice,
        subtotalFormatted: formatCurrency(invoice.subtotal),
        discountFormatted: formatCurrency(invoice.discount),
        taxFormatted: formatCurrency(invoice.tax),
        additionalChargesFormatted: formatCurrency(invoice.additionalCharges),
        roundingAdjustmentFormatted: formatCurrency(invoice.roundingAdjustment),
        grandTotalFormatted: formatCurrency(invoice.grandTotal),
        amountPaidFormatted: formatCurrency(invoice.amountPaid),
        balanceDueFormatted: formatCurrency(invoice.balanceDue),
        items: invoice.items.map(item => ({
          ...item,
          unitPriceFormatted: formatCurrency(item.unitPrice),
          discountFormatted: formatCurrency(item.discount),
          taxFormatted: formatCurrency(item.tax),
          lineTotalFormatted: formatCurrency(item.lineTotal),
          costSnapshotFormatted: formatCurrency(item.costSnapshot),
          margin: item.lineTotal - (item.quantity * item.costSnapshot),
          marginFormatted: formatCurrency(item.lineTotal - (item.quantity * item.costSnapshot)),
        })),
        payments: invoice.payments.map(p => ({
          ...p,
          amountFormatted: formatCurrency(p.amount),
        })),
      },
    },
  });
}));

// ============================================
// Create Sales Invoice
// ============================================

router.post('/', requirePermission('CREATE_SALE'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const validation = createSalesInvoiceSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const { items, ...invoiceData } = validation.data;

  // Generate invoice number
  const lastInvoice = await prisma.salesInvoice.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  const sequence = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1
    : 1;

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { invoicePrefix: true } });
  const invoiceNumber = generateInvoiceNumber(shop?.invoicePrefix || 'INV-', sequence);

  // Validate stock and calculate totals
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const item of items) {
    const lineSubtotal = item.quantity * item.unitPrice;
    subtotal += lineSubtotal;

    const itemDiscount = calculateDiscount(lineSubtotal, item.discount || 0, item.discountType || DiscountType.FIXED);
    totalDiscount += itemDiscount;
    totalTax += item.tax || 0;
  }

  const additionalCharges = invoiceData.additionalCharges || 0;
  const roundingAdjustment = invoiceData.roundingAdjustment || 0;
  const grandTotal = subtotal - totalDiscount + totalTax + additionalCharges + roundingAdjustment;
  const amountPaid = invoiceData.amountPaid || 0;
  const balanceDue = grandTotal - amountPaid;

  let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
  if (amountPaid >= grandTotal) paymentStatus = PaymentStatus.PAID;
  else if (amountPaid > 0) paymentStatus = PaymentStatus.PARTIALLY_PAID;

  // Create invoice with items in transaction
  const invoice = await prisma.$transaction(async (tx) => {
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
        throw new NotFoundError(`Product ${item.productId}`);
      }

      let availableQty = product.currentStock;
      if (item.batchId) {
        const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
        if (!batch || batch.quantityAvailable < item.quantity) {
          throw new BusinessLogicError('INSUFFICIENT_STOCK', `Insufficient stock in batch for product ${product.name}`);
        }
        availableQty = batch.quantityAvailable;
      } else if (product.expiryMode === 'BATCH_LEVEL') {
        // FEFO allocation
        let remainingQty = item.quantity;
        for (const batch of product.batches) {
          if (remainingQty <= 0) break;
          const takeQty = Math.min(batch.quantityAvailable, remainingQty);
          remainingQty -= takeQty;
        }
        if (remainingQty > 0) {
          throw new BusinessLogicError('INSUFFICIENT_STOCK', `Insufficient stock for product ${product.name} (FEFO)`);
        }
      } else if (availableQty < item.quantity) {
        throw new BusinessLogicError('INSUFFICIENT_STOCK', `Insufficient stock for product ${product.name}`);
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
            unitPrice: toMinorUnits(item.unitPrice),
            discount: toMinorUnits(item.discount || 0),
            tax: toMinorUnits(item.tax || 0),
            lineTotal: toMinorUnits(item.quantity * item.unitPrice - calculateDiscount(item.quantity * item.unitPrice, item.discount || 0, item.discountType || DiscountType.FIXED) + (item.tax || 0)),
            costSnapshot: toMinorUnits(item.unitPrice * 0.7), // Placeholder - should use actual cost
          })),
        },
      },
      include: { items: true },
    });

    // Process each item: reduce stock, create movements
    for (const item of created.items) {
      const inputItem = items.find(i => i.productId === item.productId);
      if (!inputItem) continue;

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
            if (remainingQty <= 0) break;
            const takeQty = Math.min(batch.quantityAvailable, remainingQty);

            // Create stock movement for this batch
            const qtyBefore = batch.quantityAvailable;
            const qtyAfter = qtyBefore - takeQty;

            await tx.stockMovement.create({
              data: {
                shopId,
                productId: inputItem.productId,
                batchId: batch.id,
                movementType: MovementType.SALE,
                quantityDelta: -takeQty,
                quantityBefore: qtyBefore,
                quantityAfter: qtyAfter,
                referenceType: ReferenceType.SALE,
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
        } else {
          // No batch tracking or single batch
          const productStock = await tx.product.findUnique({ where: { id: inputItem.productId }, select: { currentStock: true } });
          const qtyBefore = productStock?.currentStock || 0;
          const qtyAfter = qtyBefore - inputItem.quantity;

          await tx.stockMovement.create({
            data: {
              shopId,
              productId: inputItem.productId,
              batchId: null,
              movementType: MovementType.SALE,
              quantityDelta: -inputItem.quantity,
              quantityBefore: qtyBefore,
              quantityAfter: qtyAfter,
              referenceType: ReferenceType.SALE,
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
      } else if (batchId) {
        // Specific batch selected
        const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { quantityAvailable: true, unitCost: true } });
        if (!batch) throw new NotFoundError('Batch');

        const qtyBefore = batch.quantityAvailable;
        const qtyAfter = qtyBefore - inputItem.quantity;

        await tx.stockMovement.create({
          data: {
            shopId,
            productId: inputItem.productId,
            batchId,
            movementType: MovementType.SALE,
            quantityDelta: -inputItem.quantity,
            quantityBefore: qtyBefore,
            quantityAfter: qtyAfter,
            referenceType: ReferenceType.SALE,
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
        throw new BusinessLogicError('INSUFFICIENT_STOCK', `Could not allocate all stock for product ${inputItem.productId}`);
      }
    }

    // Handle customer payment and ledger
    if (invoiceData.customerId) {
      // Create payment record if amount paid > 0
      if (amountPaid > 0 && invoiceData.paymentMethod) {
        await tx.payment.create({
          data: {
            shopId,
            partyType: PartyType.CUSTOMER,
            partyId: invoiceData.customerId,
            referenceType: ReferenceType.SALE,
            referenceId: created.id,
            amount: toMinorUnits(amountPaid),
            method: invoiceData.paymentMethod,
            paidAt: new Date(invoiceData.invoiceDate),
            createdBy: userId,
          },
        });
      }

      // Update customer balance
      await tx.customer.update({
        where: { id: invoiceData.customerId },
        data: { currentBalance: { increment: toMinorUnits(balanceDue) } },
      });

      // Create customer ledger entry
      await tx.customerLedgerEntry.create({
        data: {
          shopId,
          customerId: invoiceData.customerId,
          entryType: LedgerEntryType.DEBIT, // Customer owes us
          referenceType: ReferenceType.SALE,
          referenceId: created.id,
          debit: toMinorUnits(grandTotal),
          credit: 0,
          balanceAfter: toMinorUnits(grandTotal), // Would need proper calculation
          description: `Invoice ${invoiceNumber}`,
        },
      });
    }

    return created;
  });

  logCreate(req, 'SalesInvoice', invoice.id, validation.data);

  res.status(201).json({
    success: true,
    data: {
      invoice: {
        ...invoice,
        subtotalFormatted: formatCurrency(invoice.subtotal),
        discountFormatted: formatCurrency(invoice.discount),
        taxFormatted: formatCurrency(invoice.tax),
        additionalChargesFormatted: formatCurrency(invoice.additionalCharges),
        roundingAdjustmentFormatted: formatCurrency(invoice.roundingAdjustment),
        grandTotalFormatted: formatCurrency(invoice.grandTotal),
        amountPaidFormatted: formatCurrency(invoice.amountPaid),
        balanceDueFormatted: formatCurrency(invoice.balanceDue),
      },
    },
  });
}));

// ============================================
// Update Sales Invoice
// ============================================

router.put('/:id', requirePermission('EDIT_SALE'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id, shopId },
  });

  if (!invoice) {
    throw new NotFoundError('Sales Invoice');
  }

  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
    throw new BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Cannot edit cancelled or refunded invoice');
  }

  const { notes, paymentStatus, amountPaid, paymentMethod, dueDate } = req.body;

  const updateData: any = {};
  if (notes !== undefined) updateData.notes = notes;
  if (dueDate) updateData.dueDate = new Date(dueDate);
  if (paymentStatus) updateData.paymentStatus = paymentStatus;

  if (amountPaid !== undefined && amountPaid !== invoice.amountPaid) {
    const newAmountPaid = toMinorUnits(amountPaid);
    const diff = newAmountPaid - invoice.amountPaid;

    updateData.amountPaid = newAmountPaid;
    updateData.balanceDue = invoice.grandTotal - newAmountPaid;

    if (newAmountPaid >= invoice.grandTotal) updateData.paymentStatus = PaymentStatus.PAID;
    else if (newAmountPaid > 0) updateData.paymentStatus = PaymentStatus.PARTIALLY_PAID;
    else updateData.paymentStatus = PaymentStatus.UNPAID;

    // Create payment record for additional payment
    if (diff > 0 && paymentMethod && invoice.customerId) {
      await prisma.payment.create({
        data: {
          shopId,
          partyType: PartyType.CUSTOMER,
          partyId: invoice.customerId,
          referenceType: ReferenceType.SALE,
          referenceId: id,
          amount: diff,
          method: paymentMethod,
          paidAt: new Date(),
          createdBy: (req as any).user?.id,
        },
      });
    }
  }

  const updatedInvoice = await prisma.salesInvoice.update({
    where: { id },
    data: updateData,
  });

  logUpdate(req, 'SalesInvoice', id, {}, updateData);

  res.json({ success: true, data: { invoice: updatedInvoice } });
}));

// ============================================
// Cancel Sales Invoice
// ============================================

router.post('/:id/cancel', requirePermission('DELETE_SALE'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { reason } = req.body;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id, shopId },
    include: { items: { include: { batch: true } } },
  });

  if (!invoice) {
    throw new NotFoundError('Sales Invoice');
  }

  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
    throw new BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Invoice already cancelled or refunded');
  }

  await prisma.$transaction(async (tx) => {
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
          movementType: MovementType.SALE_RETURN,
          quantityDelta: item.quantity,
          quantityBefore: qtyBefore,
          quantityAfter: qtyAfter,
          referenceType: ReferenceType.SALE,
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
      data: { status: InvoiceStatus.CANCELLED, balanceDue: 0, amountPaid: 0, paymentStatus: PaymentStatus.UNPAID },
    });

    // Update customer balance
    if (invoice.customerId) {
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { currentBalance: { decrement: invoice.grandTotal } },
      });
    }
  });

  logUpdate(req, 'SalesInvoice', id, { status: invoice.status }, { status: InvoiceStatus.CANCELLED, reason });

  res.json({ success: true, data: { message: 'Sales invoice cancelled successfully' } });
}));

// ============================================
// Record Payment for Invoice
// ============================================

router.post('/:id/payments', requirePermission('MANAGE_PAYMENTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { id } = req.params;
  const { amount, method, paidAt, referenceNumber, notes } = req.body;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id, shopId },
  });

  if (!invoice) {
    throw new NotFoundError('Sales Invoice');
  }

  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
    throw new BusinessLogicError('INVOICE_ALREADY_FINALIZED', 'Cannot add payment to cancelled invoice');
  }

  const paymentAmount = toMinorUnits(amount);
  if (paymentAmount > invoice.balanceDue) {
    throw new ValidationError('Payment amount exceeds balance due');
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        shopId,
        partyType: PartyType.CUSTOMER,
        partyId: invoice.customerId!,
        referenceType: ReferenceType.SALE,
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

    let newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
    if (newAmountPaid >= invoice.grandTotal) newPaymentStatus = PaymentStatus.PAID;
    else if (newAmountPaid === 0) newPaymentStatus = PaymentStatus.UNPAID;

    await tx.salesInvoice.update({
      where: { id },
      data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, paymentStatus: newPaymentStatus },
    });

    // Update customer ledger
    await tx.customerLedgerEntry.create({
      data: {
        shopId,
        customerId: invoice.customerId!,
        entryType: LedgerEntryType.CREDIT,
        referenceType: ReferenceType.PAYMENT,
        referenceId: created.id,
        debit: 0,
        credit: paymentAmount,
        balanceAfter: newBalanceDue, // Simplified
        description: `Payment received for invoice ${invoice.invoiceNumber}`,
      },
    });

    return created;
  });

  logCreate(req, 'Payment', payment.id, { invoiceId: id, amount });

  res.status(201).json({
    success: true,
    data: { payment: { ...payment, amountFormatted: formatCurrency(payment.amount) } },
  });
}));

export default router;