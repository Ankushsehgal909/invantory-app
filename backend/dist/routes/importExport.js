"use strict";
/**
 * Import/Export Routes
 * CSV import/export, backup/restore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const requestLogger_1 = require("../middleware/requestLogger");
const utils_1 = require("@shopstock/shared/utils");
const constants_1 = require("@shopstock/shared/constants");
const sync_1 = require("csv-parse/sync");
const sync_2 = require("csv-stringify/sync");
const router = (0, express_1.Router)();
// ============================================
// Export Products CSV
// ============================================
router.get('/export/products', (0, auth_1.requirePermission)('EXPORT_DATA'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { status, categoryId } = req.query;
    const where = { shopId };
    if (status)
        where.status = status;
    if (categoryId)
        where.categoryId = categoryId;
    const products = await index_1.prisma.product.findMany({
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
        'Purchase Cost': (0, utils_1.formatCurrency)(p.purchaseCost),
        'Selling Price': (0, utils_1.formatCurrency)(p.sellingPrice),
        'Tax Rate %': p.taxRate || '',
        'Reorder Level': p.reorderLevel,
        'Opening Stock': p.openingStock,
        'Current Stock': p.currentStock,
        'Expiry Mode': p.expiryMode,
        'Status': p.status,
        'Image URL': p.imageUrl || '',
    }));
    const csv = (0, sync_2.stringify)(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
}));
// ============================================
// Export Sales CSV
// ============================================
router.get('/export/sales', (0, auth_1.requirePermission)('EXPORT_DATA'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { startDate, endDate, customerId, paymentStatus } = req.query;
    if (!startDate || !endDate)
        throw new errorHandler_1.ValidationError('startDate and endDate are required');
    const where = {
        shopId,
        invoiceDate: { gte: new Date(startDate), lte: new Date(endDate) },
    };
    if (customerId)
        where.customerId = customerId;
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    const invoices = await index_1.prisma.salesInvoice.findMany({
        where,
        include: { customer: { select: { businessName: true } }, items: true },
        orderBy: { invoiceDate: 'asc' },
    });
    const csvData = invoices.flatMap(inv => inv.items.map(item => ({
        'Invoice Number': inv.invoiceNumber,
        'Invoice Date': inv.invoiceDate.toISOString().split('T')[0],
        'Customer': inv.customer?.businessName || 'Walk-in',
        'Product': item.productNameSnapshot,
        'SKU': item.skuSnapshot,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Unit Price': (0, utils_1.formatCurrency)(item.unitPrice),
        'Discount': (0, utils_1.formatCurrency)(item.discount),
        'Discount Type': item.discountType,
        'Tax': (0, utils_1.formatCurrency)(item.tax),
        'Line Total': (0, utils_1.formatCurrency)(item.lineTotal),
        'Subtotal': (0, utils_1.formatCurrency)(inv.subtotal),
        'Total Discount': (0, utils_1.formatCurrency)(inv.discount),
        'Total Tax': (0, utils_1.formatCurrency)(inv.tax),
        'Grand Total': (0, utils_1.formatCurrency)(inv.grandTotal),
        'Amount Paid': (0, utils_1.formatCurrency)(inv.amountPaid),
        'Balance Due': (0, utils_1.formatCurrency)(inv.balanceDue),
        'Payment Status': inv.paymentStatus,
    })));
    const csv = (0, sync_2.stringify)(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-${startDate}-to-${endDate}.csv"`);
    res.send(csv);
}));
// ============================================
// Export Purchases CSV
// ============================================
router.get('/export/purchases', (0, auth_1.requirePermission)('EXPORT_DATA'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { startDate, endDate, supplierId, paymentStatus } = req.query;
    if (!startDate || !endDate)
        throw new errorHandler_1.ValidationError('startDate and endDate are required');
    const where = {
        shopId,
        purchaseDate: { gte: new Date(startDate), lte: new Date(endDate) },
    };
    if (supplierId)
        where.supplierId = supplierId;
    if (paymentStatus)
        where.paymentStatus = paymentStatus;
    const purchases = await index_1.prisma.purchase.findMany({
        where,
        include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
        orderBy: { purchaseDate: 'asc' },
    });
    const csvData = purchases.flatMap(pur => pur.items.map(item => ({
        'Purchase Number': pur.invoiceNumber,
        'Purchase Date': pur.purchaseDate.toISOString().split('T')[0],
        'Supplier': pur.supplier?.name || '',
        'Supplier Invoice': pur.supplierInvoiceNumber || '',
        'Product': item.product?.name || '',
        'SKU': item.product?.sku || '',
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Unit Cost': (0, utils_1.formatCurrency)(item.unitCost),
        'Discount': (0, utils_1.formatCurrency)(item.discount),
        'Tax': (0, utils_1.formatCurrency)(item.tax),
        'Line Total': (0, utils_1.formatCurrency)(item.lineTotal),
        'Subtotal': (0, utils_1.formatCurrency)(pur.subtotal),
        'Total Discount': (0, utils_1.formatCurrency)(pur.discount),
        'Total Tax': (0, utils_1.formatCurrency)(pur.tax),
        'Grand Total': (0, utils_1.formatCurrency)(pur.grandTotal),
        'Amount Paid': (0, utils_1.formatCurrency)(pur.amountPaid),
        'Balance Due': (0, utils_1.formatCurrency)(pur.balanceDue),
        'Payment Status': pur.paymentStatus,
    })));
    const csv = (0, sync_2.stringify)(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="purchases-${startDate}-to-${endDate}.csv"`);
    res.send(csv);
}));
// ============================================
// Export Stock Report CSV
// ============================================
router.get('/export/stock', (0, auth_1.requirePermission)('EXPORT_DATA'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { includeBatches } = req.query;
    const products = await index_1.prisma.product.findMany({
        where: { shopId, status: { not: constants_1.ProductStatus.DELETED } },
        include: { category: { select: { name: true } }, batches: { where: { quantityAvailable: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
        orderBy: { name: 'asc' },
    });
    let csvData = [];
    if (includeBatches === 'true') {
        csvData = products.flatMap(p => p.batches.length > 0 ? p.batches.map(b => ({
            'Product': p.name,
            'SKU': p.sku,
            'Category': p.category?.name || '',
            'Unit': p.unit,
            'Batch Number': b.batchNumber,
            'Batch Qty': b.quantityAvailable,
            'Expiry Date': b.expiryDate?.toISOString().split('T')[0] || '',
            'Unit Cost': (0, utils_1.formatCurrency)(b.unitCost),
            'Batch Value': (0, utils_1.formatCurrency)(b.quantityAvailable * b.unitCost),
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
            }]);
    }
    else {
        csvData = products.map(p => ({
            'Product': p.name,
            'SKU': p.sku,
            'Barcode': p.barcode || '',
            'Category': p.category?.name || '',
            'Brand': p.brand || '',
            'Unit': p.unit,
            'Current Stock': p.currentStock,
            'Reorder Level': p.reorderLevel,
            'Purchase Cost': (0, utils_1.formatCurrency)(p.purchaseCost),
            'Selling Price': (0, utils_1.formatCurrency)(p.sellingPrice),
            'Stock Value (Cost)': (0, utils_1.formatCurrency)(p.currentStock * p.purchaseCost),
            'Stock Value (Sale)': (0, utils_1.formatCurrency)(p.currentStock * p.sellingPrice),
            'Expiry Mode': p.expiryMode,
            'Status': p.status,
        }));
    }
    const csv = (0, sync_2.stringify)(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="stock-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
}));
// ============================================
// Export Receivables CSV
// ============================================
router.get('/export/receivables', (0, auth_1.requirePermission)('EXPORT_DATA'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const customers = await index_1.prisma.customer.findMany({
        where: { shopId, isActive: true },
        include: { salesInvoices: { where: { balanceDue: { gt: 0 } } } },
    });
    const csvData = customers.map(c => ({
        'Customer': c.businessName,
        'Contact Person': c.contactPerson || '',
        'Phone': c.phone || '',
        'Email': c.email || '',
        'Total Outstanding': (0, utils_1.formatCurrency)(c.currentBalance),
        'Open Invoices': c.salesInvoices.length,
        'Oldest Invoice': c.salesInvoices.length > 0 ? c.salesInvoices.reduce((oldest, inv) => inv.invoiceDate < oldest ? inv.invoiceDate : oldest, c.salesInvoices[0].invoiceDate).toISOString().split('T')[0] : '',
    }));
    const csv = (0, sync_2.stringify)(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="receivables-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
}));
// ============================================
// Export Payables CSV
// ============================================
router.get('/export/payables', (0, auth_1.requirePermission)('EXPORT_DATA'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const suppliers = await index_1.prisma.supplier.findMany({
        where: { shopId, isActive: true },
        include: { purchases: { where: { balanceDue: { gt: 0 } } } },
    });
    const csvData = suppliers.map(s => ({
        'Supplier': s.name,
        'Contact Person': s.contactPerson || '',
        'Phone': s.phone || '',
        'Email': s.email || '',
        'Total Outstanding': (0, utils_1.formatCurrency)(s.currentBalance),
        'Open Purchases': s.purchases.length,
    }));
    const csv = (0, sync_2.stringify)(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payables-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
}));
// ============================================
// Import Products CSV
// ============================================
router.post('/import/products', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const userId = req.user?.id;
    const { csv, dryRun } = req.body;
    if (!csv)
        throw new errorHandler_1.ValidationError('CSV data is required');
    const records = (0, sync_1.parse)(csv, { columns: true, skip_empty_lines: true, trim: true });
    const results = {
        success: 0,
        failed: 0,
        errors: [],
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
            const existingSku = await index_1.prisma.product.findFirst({ where: { shopId, sku: row.SKU } });
            if (existingSku)
                throw new Error(`SKU already exists`);
            // Check barcode uniqueness
            if (row.Barcode) {
                const existingBarcode = await index_1.prisma.product.findFirst({ where: { shopId, barcode: row.Barcode } });
                if (existingBarcode)
                    throw new Error(`Barcode already exists`);
            }
            // Find or create category
            let categoryId;
            if (row.Category) {
                let category = await index_1.prisma.category.findFirst({ where: { shopId, name: row.Category } });
                if (!category) {
                    category = await index_1.prisma.category.create({ data: { shopId, name: row.Category } });
                }
                categoryId = category.id;
            }
            if (!dryRun) {
                await index_1.prisma.product.create({
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
        }
        catch (error) {
            results.failed++;
            results.errors.push({ row: rowNum, message: error.message, data: row });
        }
    }
    (0, requestLogger_1.logAction)(req, 'IMPORT_PRODUCTS', 'Product', '', { success: results.success, failed: results.failed });
    res.json({ success: true, data: results });
}));
// ============================================
// Get Import Template
// ============================================
router.get('/import/template/products', (0, auth_1.requirePermission)('MANAGE_PRODUCTS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    const csv = (0, sync_2.stringify)(template, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
    res.send(csv);
}));
// ============================================
// Backup Database
// ============================================
router.post('/backup', (0, auth_1.requireRole)(auth_1.UserRole.OWNER), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // In production, this would trigger a background job to backup the database
    // For now, return success
    (0, requestLogger_1.logAction)(req, 'BACKUP', 'Database', '');
    res.json({ success: true, data: { message: 'Backup initiated. You will be notified when complete.' } });
}));
// ============================================
// Restore Database
// ============================================
router.post('/restore', (0, auth_1.requireRole)(auth_1.UserRole.OWNER), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // In production, this would restore from a backup file
    // For now, return success
    (0, requestLogger_1.logAction)(req, 'RESTORE', 'Database', '');
    res.json({ success: true, data: { message: 'Restore initiated. This may take several minutes.' } });
}));
exports.default = router;
//# sourceMappingURL=importExport.js.map