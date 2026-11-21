/**
 * Report Routes
 * Dashboard summary, stock reports, sales reports, purchase reports, expiry reports, receivables, payables
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';
import { startOfDay, endOfDay, addDays } from '@shopstock/shared/utils';

const router = Router();

// ============================================
// Dashboard Summary
// ============================================

router.get('/dashboard', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { period = 'today' } = req.query;

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'today':
      startDate = startOfDay();
      endDate = endOfDay();
      break;
    case '7d':
      startDate = startOfDay(addDays(new Date(), -7));
      endDate = endOfDay();
      break;
    case '30d':
      startDate = startOfDay(addDays(new Date(), -30));
      endDate = endOfDay();
      break;
    default:
      startDate = startOfDay();
      endDate = endOfDay();
  }

  const [
    totalProducts,
    totalStockUnits,
    stockValueAtCost,
    stockValueAtSale,
    todaySales,
    todaySalesCount,
    todayPurchases,
    lowStockCount,
    outOfStockCount,
    expiringSoonCount,
    expiredCount,
    totalReceivables,
    totalOverdueReceivables,
    totalPayables,
    recentTransactions,
  ] = await Promise.all([
    prisma.product.count({ where: { shopId, status: 'ACTIVE' } }),
    prisma.product.aggregate({ where: { shopId, status: 'ACTIVE' }, _sum: { currentStock: true } }),
    prisma.product.aggregate({
      where: { shopId, status: 'ACTIVE' },
      _sum: { currentStock: true },
    }).then(r => Number(r._sum.currentStock || 0) * 0), // Will calculate properly below
    prisma.product.aggregate({ where: { shopId, status: 'ACTIVE' }, _sum: { currentStock: true } }).then(r => 0),
    prisma.salesInvoice.aggregate({
      where: { shopId, invoiceDate: { gte: startDate, lte: endDate } },
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.purchase.aggregate({
      where: { shopId, purchaseDate: { gte: startDate, lte: endDate } },
      _sum: { grandTotal: true },
    }),
    prisma.product.count({
      where: { shopId, status: 'ACTIVE', currentStock: { lte: prisma.product.fields.reorderLevel, gt: 0 } },
    }),
    prisma.product.count({ where: { shopId, status: 'ACTIVE', currentStock: { lte: 0 } } }),
    prisma.batch.count({
      where: {
        product: { shopId },
        expiryDate: { gte: new Date(), lte: addDays(new Date(), 30) },
        quantityAvailable: { gt: 0 },
      },
    }),
    prisma.batch.count({
      where: { product: { shopId }, expiryDate: { lt: new Date() }, quantityAvailable: { gt: 0 } },
    }),
    prisma.customer.aggregate({ where: { shopId, isActive: true }, _sum: { currentBalance: true } }),
    prisma.customer.aggregate({
      where: { shopId, isActive: true, currentBalance: { gt: 0 } },
      _sum: { currentBalance: true },
    }).then(r => 0), // Would need aging calculation
    prisma.supplier.aggregate({ where: { shopId, isActive: true }, _sum: { currentBalance: true } }),
    prisma.stockMovement.findMany({
      where: { shopId, createdAt: { gte: startDate, lte: endDate } },
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Calculate stock values properly
  const products = await prisma.product.findMany({
    where: { shopId, status: 'ACTIVE' },
    select: { currentStock: true, purchaseCost: true, sellingPrice: true },
  });

  const stockValueAtCostCalc = products.reduce((sum, p) => sum + p.currentStock * p.purchaseCost, 0);
  const stockValueAtSaleCalc = products.reduce((sum, p) => sum + p.currentStock * p.sellingPrice, 0);
  const totalStockUnitsCalc = products.reduce((sum, p) => sum + p.currentStock, 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalProducts,
        totalStockUnits: totalStockUnitsCalc,
        stockValueAtCost: stockValueAtCostCalc,
        stockValueAtSale: stockValueAtSaleCalc,
        todaySales: todaySales._sum.grandTotal || 0,
        todaySalesCount: todaySales._count || 0,
        todayPurchases: todayPurchases._sum.grandTotal || 0,
        lowStockCount,
        outOfStockCount,
        expiringSoonCount,
        expiredCount,
        totalReceivables: totalReceivables._sum.currentBalance || 0,
        totalOverdueReceivables: 0, // Would need aging
        totalPayables: totalPayables._sum.currentBalance || 0,
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          type: t.movementType.includes('SALE') ? 'SALE' : t.movementType.includes('PURCHASE') ? 'PURCHASE' : 'ADJUSTMENT',
          referenceNumber: t.referenceId,
          date: t.createdAt,
          amount: Math.abs(t.quantityDelta) * (t.unitCost || 0),
          partyName: t.product?.name,
          itemCount: 1,
        })),
      },
    },
  });
}));

// ============================================
// Stock Report
// ============================================

router.get('/stock', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { categoryId, lowStockOnly, outOfStockOnly, includeArchived, page = 1, limit = 100 } = req.query;

  const where: any = { shopId };

  if (includeArchived !== 'true') where.status = { not: 'DELETED' };
  if (categoryId) where.categoryId = categoryId;
  if (lowStockOnly === 'true') where.currentStock = { lte: prisma.product.fields.reorderLevel, gt: 0 };
  if (outOfStockOnly === 'true') where.currentStock = { lte: 0 };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        batches: { where: { quantityAvailable: { gt: 0 } }, orderBy: { expiryDate: 'asc' } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  const report = products.map(p => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    category: p.category?.name,
    unit: p.unit,
    currentStock: p.currentStock,
    reorderLevel: p.reorderLevel,
    purchaseCost: p.purchaseCost,
    sellingPrice: p.sellingPrice,
    stockValueAtCost: p.currentStock * p.purchaseCost,
    stockValueAtSale: p.currentStock * p.sellingPrice,
    batches: p.batches.map(b => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      quantityAvailable: b.quantityAvailable,
      expiryDate: b.expiryDate,
      unitCost: b.unitCost,
      costValue: b.quantityAvailable * b.unitCost,
      isExpired: b.expiryDate ? new Date(b.expiryDate) < new Date() : false,
      daysToExpiry: b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    })),
    isLowStock: p.currentStock <= p.reorderLevel && p.currentStock > 0,
    isOutOfStock: p.currentStock <= 0,
  }));

  res.json({
    success: true,
    data: { report },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Sales Report
// ============================================

router.get('/sales', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { startDate, endDate, customerId, paymentStatus, page = 1, limit = 100 } = req.query;

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }

  const where: any = {
    shopId,
    invoiceDate: { gte: new Date(startDate as string), lte: new Date(endDate as string) },
  };

  if (customerId) where.customerId = customerId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, businessName: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  const report = invoices.map(inv => ({
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    customerName: inv.customer?.businessName,
    itemCount: inv._count?.items || 0,
    subtotal: inv.subtotal,
    discount: inv.discount,
    tax: inv.tax,
    grandTotal: inv.grandTotal,
    amountPaid: inv.amountPaid,
    balanceDue: inv.balanceDue,
    paymentStatus: inv.paymentStatus,
  }));

  const totals = invoices.reduce((acc, inv) => ({
    subtotal: acc.subtotal + inv.subtotal,
    discount: acc.discount + inv.discount,
    tax: acc.tax + inv.tax,
    grandTotal: acc.grandTotal + inv.grandTotal,
    amountPaid: acc.amountPaid + inv.amountPaid,
    balanceDue: acc.balanceDue + inv.balanceDue,
  }), { subtotal: 0, discount: 0, tax: 0, grandTotal: 0, amountPaid: 0, balanceDue: 0 });

  res.json({
    success: true,
    data: { report, totals },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Purchase Report
// ============================================

router.get('/purchases', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { startDate, endDate, supplierId, paymentStatus, page = 1, limit = 100 } = req.query;

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }

  const where: any = {
    shopId,
    purchaseDate: { gte: new Date(startDate as string), lte: new Date(endDate as string) },
  };

  if (supplierId) where.supplierId = supplierId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.purchase.count({ where }),
  ]);

  const report = purchases.map(pur => ({
    purchaseId: pur.id,
    invoiceNumber: pur.invoiceNumber,
    purchaseDate: pur.purchaseDate,
    supplierName: pur.supplier?.name,
    itemCount: pur._count?.items || 0,
    subtotal: pur.subtotal,
    discount: pur.discount,
    tax: pur.tax,
    grandTotal: pur.grandTotal,
    amountPaid: pur.amountPaid,
    balanceDue: pur.balanceDue,
    paymentStatus: pur.paymentStatus,
  }));

  res.json({
    success: true,
    data: { report },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// ============================================
// Expiry Report
// ============================================

router.get('/expiry', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { status, categoryId, productId, startDate, endDate, page = 1, limit = 100 } = req.query;

  const where: any = { product: { shopId }, quantityAvailable: { gt: 0 } };

  if (startDate || endDate) {
    where.expiryDate = {};
    if (startDate) where.expiryDate.gte = new Date(startDate as string);
    if (endDate) where.expiryDate.lte = new Date(endDate as string);
  }

  if (categoryId) where.product = { ...where.product, categoryId };
  if (productId) where.product = { ...where.product, id: productId };

  const batches = await prisma.batch.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true }, include: { category: { select: { name: true } } } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  const now = new Date();
  const report = batches.map(b => {
    const daysToExpiry = b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    let itemStatus = 'NO_EXPIRY';
    if (b.expiryDate && b.expiryDate < now) itemStatus = 'EXPIRED';
    else if (daysToExpiry !== null && daysToExpiry <= 30) itemStatus = 'EXPIRING_SOON';

    if (status && itemStatus !== status) return null;

    return {
      productId: b.product.id,
      productName: b.product.name,
      sku: b.product.sku,
      category: b.product.category?.name,
      batchId: b.id,
      batchNumber: b.batchNumber,
      quantityAvailable: b.quantityAvailable,
      expiryDate: b.expiryDate,
      unitCost: b.unitCost,
      costValue: b.quantityAvailable * b.unitCost,
      daysToExpiry,
      status: itemStatus,
    };
  }).filter(Boolean);

  res.json({
    success: true,
    data: { report: report.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit)) },
    meta: { total: report.length, page: Number(page), limit: Number(limit) },
  });
}));

// ============================================
// Receivables Report (Customer Outstanding)
// ============================================

router.get('/receivables', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const customers = await prisma.customer.findMany({
    where: { shopId, isActive: true, currentBalance: { gt: 0 } },
    include: {
      salesInvoices: {
        where: { balanceDue: { gt: 0 } },
        select: { id: true, invoiceNumber: true, invoiceDate: true, grandTotal: true, amountPaid: true, balanceDue: true, dueDate: true },
      },
    },
  });

  const report = customers.map(c => {
    const invoices = c.salesInvoices;
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    const overdue = invoices.filter(inv => inv.dueDate && new Date(inv.dueDate) < new Date());
    const overdueAmount = overdue.reduce((sum, inv) => sum + inv.balanceDue, 0);

    // Aging buckets
    const now = new Date();
    const notDue = invoices.filter(inv => !inv.dueDate || new Date(inv.dueDate) >= now);
    const days1_30 = invoices.filter(inv => {
      if (!inv.dueDate) return false;
      const diff = (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    });
    const days31_60 = invoices.filter(inv => {
      if (!inv.dueDate) return false;
      const diff = (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 30 && diff <= 60;
    });
    const days61_90 = invoices.filter(inv => {
      if (!inv.dueDate) return false;
      const diff = (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 60 && diff <= 90;
    });
    const days90Plus = invoices.filter(inv => {
      if (!inv.dueDate) return false;
      const diff = (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 90;
    });

    return {
      customerId: c.id,
      customerName: c.businessName,
      phone: c.phone,
      totalOutstanding,
      overdueAmount,
      notDue: notDue.reduce((sum, inv) => sum + inv.balanceDue, 0),
      days1_30: days1_30.reduce((sum, inv) => sum + inv.balanceDue, 0),
      days31_60: days31_60.reduce((sum, inv) => sum + inv.balanceDue, 0),
      days61_90: days61_90.reduce((sum, inv) => sum + inv.balanceDue, 0),
      days90Plus: days90Plus.reduce((sum, inv) => sum + inv.balanceDue, 0),
      oldestInvoiceDate: invoices.length > 0 ? invoices.reduce((oldest, inv) => inv.invoiceDate < oldest ? inv.invoiceDate : oldest, invoices[0].invoiceDate) : null,
    };
  });

  res.json({ success: true, data: { report } });
}));

// ============================================
// Payables Report (Supplier Outstanding)
// ============================================

router.get('/payables', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const suppliers = await prisma.supplier.findMany({
    where: { shopId, isActive: true, currentBalance: { gt: 0 } },
    include: {
      purchases: {
        where: { balanceDue: { gt: 0 } },
        select: { id: true, invoiceNumber: true, purchaseDate: true, grandTotal: true, amountPaid: true, balanceDue: true },
      },
    },
  });

  const report = suppliers.map(s => {
    const purchases = s.purchases;
    const totalOutstanding = purchases.reduce((sum, pur) => sum + pur.balanceDue, 0);

    return {
      supplierId: s.id,
      supplierName: s.name,
      phone: s.phone,
      totalOutstanding,
      overdueAmount: 0, // Would need due dates on purchases
      notDue: totalOutstanding,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
      oldestPurchaseDate: purchases.length > 0 ? purchases.reduce((oldest, pur) => pur.purchaseDate < oldest ? pur.purchaseDate : oldest, purchases[0].purchaseDate) : null,
    };
  });

  res.json({ success: true, data: { report } });
}));

// ============================================
// Stock Movement Ledger
// ============================================

router.get('/stock-movements', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { startDate, endDate, productId, movementType, page = 1, limit = 100 } = req.query;

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }

  const where: any = {
    shopId,
    createdAt: { gte: new Date(startDate as string), lte: new Date(endDate as string) },
  };

  if (productId) where.productId = productId;
  if (movementType) where.movementType = movementType;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        batch: { select: { id: true, batchNumber: true } },
        actor: { select: { id: true, name: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.json({
    success: true,
    data: { movements },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

export default router;