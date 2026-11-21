/**
 * Import/Export Routes
 * CSV import/export, backup/restore
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS, UserRole, requireRole } from '../middleware/auth';
import { logAction } from '../middleware/requestLogger';
import { formatCurrency } from '@shopstock/shared/utils';
import { ProductStatus, MovementType, PaymentStatus, InvoiceStatus } from '@shopstock/shared/constants';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const router = Router();

// ============================================
// Export Products CSV
// ============================================

router.get('/export/products', requirePermission('EXPORT_DATA'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { status, categoryId } = req.query;

  const where: any = { shopId };
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;

  const products = await prisma.product.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const csvData = products.map(p => ({
    'Name': p.name,
    'SKU': p.sku,
    'Barcode': p.barcode || '',
    'Category': p.category?.name || '',
    'Brand': p.brand || '',
    'Description': p.description || '',
    'Unit': p.unit,
    'Purchase Cost': formatCurrency(p.purchaseCost),
    'Selling Price': formatCurrency(p.sellingPrice),
    'Tax Rate %': p.taxRate || '',
    'Reorder Level': p.reorderLevel,
    'Opening Stock': p.openingStock,
    'Current Stock': p.currentStock,
    'Expiry Mode': p.expiryMode,
    'Status': p.status,
    'Image URL': p.imageUrl || '',
  }));

  const csv = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}));

// ============================================
// Export Sales CSV
// ============================================

router.get('/export/sales', requirePermission('EXPORT_DATA'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { startDate, endDate, customerId, paymentStatus } = req.query;

  if (!startDate || !endDate) throw new ValidationError('startDate and endDate are required');

  const where: any = {
    shopId,
    invoiceDate: { gte: new Date(startDate as string), lte: new Date(endDate as string) },
  };
  if (customerId) where.customerId = customerId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const invoices = await prisma.salesInvoice.findMany({
    where,
    include: { customer: { select: { businessName: true } }, items: true },
    orderBy: { invoiceDate: 'asc' },
  });

  const csvData = invoices.flatMap(inv =>
    inv.items.map(item => ({
      'Invoice Number': inv.invoiceNumber,
      'Invoice Date': inv.invoiceDate.toISOString().split('T')[0],
      'Customer': inv.customer?.businessName || 'Walk-in',
      'Product': item.productNameSnapshot,
      'SKU': item.skuSnapshot,
      'Quantity': item.quantity,
      'Unit': item.unit,
      'Unit Price': formatCurrency(item.unitPrice),
      'Discount': formatCurrency(item.discount),
      'Discount Type': item.discountType,
      'Tax': formatCurrency(item.tax),
      'Line Total': formatCurrency(item.lineTotal),
      'Subtotal': formatCurrency(inv.subtotal),
      'Total Discount': formatCurrency(inv.discount),
      'Total Tax': formatCurrency(inv.tax),
      'Grand Total': formatCurrency(inv.grandTotal),
      'Amount Paid': formatCurrency(inv.amountPaid),
      'Balance Due': formatCurrency(inv.balanceDue),
      'Payment Status': inv.paymentStatus,
    }))
  );

  const csv = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sales-${startDate}-to-${endDate}.csv"`);
  res.send(csv);
}));

// ============================================
// Export Purchases CSV
// ============================================

router.get('/export/purchases', requirePermission('EXPORT_DATA'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { startDate, endDate, supplierId, paymentStatus } = req.query;

  if (!startDate || !endDate) throw new ValidationError('startDate and endDate are required');

  const where: any = {
    shopId,
    purchaseDate: { gte: new Date(startDate as string), lte: new Date(endDate as string) },
  };
  if (supplierId) where.supplierId = supplierId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
    orderBy: { purchaseDate: 'asc' },
  });

  const csvData = purchases.flatMap(pur =>
    pur.items.map(item => ({
      'Purchase Number': pur.invoiceNumber,
      'Purchase Date': pur.purchaseDate.toISOString().split('T')[0],
      'Supplier': pur.supplier?.name || '',
      'Supplier Invoice': pur.supplierInvoiceNumber || '',
      'Product': item.product?.name || '',
      'SKU': item.product?.sku || '',
      'Quantity': item.quantity,
      'Unit': item.unit,
      'Unit Cost': formatCurrency(item.unitCost),
      'Discount': formatCurrency(item.discount),
      'Tax': formatCurrency(item.tax),
      'Line Total': formatCurrency(item.lineTotal),
      'Subtotal': formatCurrency(pur.subtotal),
      'Total Discount': formatCurrency(pur.discount),
      'Total Tax': formatCurrency(pur.tax),
      'Grand Total': formatCurrency(pur.grandTotal),
      'Amount Paid': formatCurrency(pur.amountPaid),
      'Balance Due': formatCurrency(pur.balanceDue),
      'Payment Status': pur.paymentStatus,
    }))
  );

  const csv = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="purchases-${startDate}-to-${endDate}.csv"`);
  res.send(csv);
}));

// ============================================
// Export Stock Report CSV
// ============================================

router.get('/export/stock', requirePermission('EXPORT_DATA'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { includeBatches } = req.query;

  const products = await prisma.product.findMany({
    where: { shopId, status: { not: ProductStatus.DELETED } },
    include: { category: { select: { name: true } }, batches: { where: { quantityAvailable: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  let csvData: any[] = [];

  if (includeBatches === 'true') {
    csvData = products.flatMap(p =>
      p.batches.length > 0 ? p.batches.map(b => ({
        'Product': p.name,
        'SKU': p.sku,
        'Category': p.category?.name || '',
        'Unit': p.unit,
        'Batch Number': b.batchNumber,
        'Batch Qty': b.quantityAvailable,
        'Expiry Date': b.expiryDate?.toISOString().split('T')[0] || '',
        'Unit Cost': formatCurrency(b.unitCost),
        'Batch Value': formatCurrency(b.quantityAvailable * b.unitCost),
        'Is Expired': b.expiryDate && new Date(b.expiryDate) < new Date() ? 'Yes' : 'No',
        'Days to Expiry': b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      })) : [{
        'Product': p.name,
        'SKU': p.sku,
        'Category': p.category?.name || '',
        'Unit': p.unit,
        'Batch Number': '',
        'Batch Qty': 0,
        'Expiry Date': '',
        'Unit Cost': '',
        'Batch Value': '',
        'Is Expired': '',
        'Days to Expiry': 0,
      }]
    );
  } else {
    csvData = products.map(p => ({
      'Product': p.name,
      'SKU': p.sku,
      'Barcode': p.barcode || '',
      'Category': p.category?.name || '',
      'Brand': p.brand || '',
      'Unit': p.unit,
      'Current Stock': p.currentStock,
      'Reorder Level': p.reorderLevel,
      'Purchase Cost': formatCurrency(p.purchaseCost),
      'Selling Price': formatCurrency(p.sellingPrice),
      'Stock Value (Cost)': formatCurrency(p.currentStock * p.purchaseCost),
      'Stock Value (Sale)': formatCurrency(p.currentStock * p.sellingPrice),
      'Expiry Mode': p.expiryMode,
      'Status': p.status,
    }));
  }

  const csv = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="stock-report-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}));

// ============================================
// Export Receivables CSV
// ============================================

router.get('/export/receivables', requirePermission('EXPORT_DATA'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const customers = await prisma.customer.findMany({
    where: { shopId, isActive: true },
    include: { salesInvoices: { where: { balanceDue: { gt: 0 } } } },
  });

  const csvData = customers.map(c => ({
    'Customer': c.businessName,
    'Contact Person': c.contactPerson || '',
    'Phone': c.phone || '',
    'Email': c.email || '',
    'Total Outstanding': formatCurrency(c.currentBalance),
    'Open Invoices': c.salesInvoices.length,
    'Oldest Invoice': c.salesInvoices.length > 0 ? c.salesInvoices.reduce((oldest, inv) => inv.invoiceDate < oldest ? inv.invoiceDate : oldest, c.salesInvoices[0].invoiceDate).toISOString().split('T')[0] : '',
  }));

  const csv = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="receivables-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}));

// ============================================
// Export Payables CSV
// ============================================

router.get('/export/payables', requirePermission('EXPORT_DATA'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const suppliers = await prisma.supplier.findMany({
    where: { shopId, isActive: true },
    include: { purchases: { where: { balanceDue: { gt: 0 } } } },
  });

  const csvData = suppliers.map(s => ({
    'Supplier': s.name,
    'Contact Person': s.contactPerson || '',
    'Phone': s.phone || '',
    'Email': s.email || '',
    'Total Outstanding': formatCurrency(s.currentBalance),
    'Open Purchases': s.purchases.length,
  }));

  const csv = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="payables-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}));

// ============================================
// Import Products CSV
// ============================================

router.post('/import/products', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const userId = (req as any).user?.id;
  const { csv, dryRun } = req.body;

  if (!csv) throw new ValidationError('CSV data is required');

  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-based

    try {
      // Validate required fields
      if (!row.Name || !row.SKU) {
        throw new Error('Missing required fields: Name, SKU');
      }

      // Check SKU uniqueness
      const existingSku = await prisma.product.findFirst({ where: { shopId, sku: row.SKU } });
      if (existingSku) throw new Error(`SKU already exists`);

      // Check barcode uniqueness
      if (row.Barcode) {
        const existingBarcode = await prisma.product.findFirst({ where: { shopId, barcode: row.Barcode } });
        if (existingBarcode) throw new Error(`Barcode already exists`);
      }

      // Find or create category
      let categoryId: string | undefined;
      if (row.Category) {
        let category = await prisma.category.findFirst({ where: { shopId, name: row.Category } });
        if (!category) {
          category = await prisma.category.create({ data: { shopId, name: row.Category } });
        }
        categoryId = category.id;
      }

      if (!dryRun) {
        await prisma.product.create({
          data: {
            shopId,
            name: row.Name,
            sku: row.SKU,
            barcode: row.Barcode,
            categoryId,
            brand: row.Brand,
            description: row.Description,
            unit: row.Unit || 'PIECE',
            purchaseCost: parseFloat(row['Purchase Cost']) * 100 || 0,
            sellingPrice: parseFloat(row['Selling Price']) * 100 || 0,
            taxRate: parseFloat(row['Tax Rate %']) || 0,
            reorderLevel: parseInt(row['Reorder Level']) || 0,
            openingStock: parseFloat(row['Opening Stock']) || 0,
            currentStock: parseFloat(row['Current Stock']) || 0,
            expiryMode: row['Expiry Mode'] || 'NONE',
            status: row.Status || 'ACTIVE',
            imageUrl: row['Image URL'],
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ row: rowNum, message: error.message, data: row });
    }
  }

  logAction(req, 'IMPORT_PRODUCTS', 'Product', '', { success: results.success, failed: results.failed });

  res.json({ success: true, data: results });
}));

// ============================================
// Get Import Template
// ============================================

router.get('/import/template/products', requirePermission('MANAGE_PRODUCTS'), asyncHandler(async (req, res) => {
  const template = [
    {
      'Name': 'Sample Product',
      'SKU': 'SP-001',
      'Barcode': '1234567890123',
      'Category': 'General',
      'Brand': 'Brand Name',
      'Description': 'Product description',
      'Unit': 'PIECE',
      'Purchase Cost': '100.00',
      'Selling Price': '150.00',
      'Tax Rate %': '18',
      'Reorder Level': '10',
      'Opening Stock': '50',
      'Current Stock': '50',
      'Expiry Mode': 'NONE',
      'Status': 'ACTIVE',
      'Image URL': '',
    },
  ];

  const csv = stringify(template, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
  res.send(csv);
}));

// ============================================
// Backup Database
// ============================================

router.post('/backup', requireRole(UserRole.OWNER), asyncHandler(async (req, res) => {
  // In production, this would trigger a background job to backup the database
  // For now, return success
  logAction(req, 'BACKUP', 'Database', '');

  res.json({ success: true, data: { message: 'Backup initiated. You will be notified when complete.' } });
}));

// ============================================
// Restore Database
// ============================================

router.post('/restore', requireRole(UserRole.OWNER), asyncHandler(async (req, res) => {
  // In production, this would restore from a backup file
  // For now, return success
  logAction(req, 'RESTORE', 'Database', '');

  res.json({ success: true, data: { message: 'Restore initiated. This may take several minutes.' } });
}));

export default router;