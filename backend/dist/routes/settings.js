"use strict";
/**
 * Settings Routes
 * Shop settings, tax configuration, user preferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const requestLogger_1 = require("../middleware/requestLogger");
const constants_1 = require("@shopstock/shared/constants");
const router = (0, express_1.Router)();
// ============================================
// Get Shop Settings
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const shop = await index_1.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
            taxSettings: true,
            settings: true,
            currency: true,
            timezone: true,
            invoicePrefix: true,
            purchasePrefix: true,
        },
    });
    if (!shop)
        throw new errorHandler_1.NotFoundError('Shop');
    res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings, currency: shop.currency, timezone: shop.timezone, invoicePrefix: shop.invoicePrefix, purchasePrefix: shop.purchasePrefix } });
}));
// ============================================
// Update Shop Settings
// ============================================
router.put('/', (0, auth_1.requirePermission)('MANAGE_SETTINGS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { settings, taxSettings, currency, timezone, invoicePrefix, purchasePrefix } = req.body;
    const updateData = {};
    if (settings)
        updateData.settings = settings;
    if (taxSettings)
        updateData.taxSettings = taxSettings;
    if (currency)
        updateData.currency = currency;
    if (timezone)
        updateData.timezone = timezone;
    if (invoicePrefix)
        updateData.invoicePrefix = invoicePrefix;
    if (purchasePrefix)
        updateData.purchasePrefix = purchasePrefix;
    const shop = await index_1.prisma.shop.update({
        where: { id: shopId },
        data: updateData,
        select: { taxSettings: true, settings: true, currency: true, timezone: true, invoicePrefix: true, purchasePrefix: true },
    });
    (0, requestLogger_1.logUpdate)(req, 'ShopSettings', shopId, {}, updateData);
    res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings, currency: shop.currency, timezone: shop.timezone, invoicePrefix: shop.invoicePrefix, purchasePrefix: shop.purchasePrefix } });
}));
// ============================================
// Get User Preferences
// ============================================
router.get('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    // In a real app, this would come from a UserPreferences table
    // For now, return defaults
    res.json({
        success: true,
        data: {
            preferences: {
                theme: 'light',
                language: 'en',
                dateFormat: 'dd/MM/yyyy',
                currencyFormat: 'en-IN',
                notifications: {
                    lowStock: true,
                    expirySoon: true,
                    expired: true,
                    dailySummary: false,
                    paymentReceived: true,
                    paymentOverdue: true,
                },
                dashboard: {
                    defaultPeriod: 'today',
                    showCharts: true,
                },
            },
        },
    });
}));
// ============================================
// Update User Preferences
// ============================================
router.put('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { preferences } = req.body;
    // In a real app, save to UserPreferences table
    // For now, just return success
    res.json({ success: true, data: { message: 'Preferences updated', preferences } });
}));
// ============================================
// Get Tax Types Reference
// ============================================
router.get('/meta/tax-types', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const types = Object.values(constants_1.TaxType).map(t => ({ value: t, label: t }));
    res.json({ success: true, data: { types } });
}));
// ============================================
// Get Units of Measure Reference
// ============================================
router.get('/meta/units', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const units = Object.values(constants_1.UnitOfMeasure).map(u => ({ value: u, label: u }));
    res.json({ success: true, data: { units } });
}));
// ============================================
// Get Payment Methods Reference
// ============================================
router.get('/meta/payment-methods', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const methods = Object.values(constants_1.PaymentMethod).map(m => ({ value: m, label: m }));
    res.json({ success: true, data: { methods } });
}));
// ============================================
// Get Roles Reference
// ============================================
router.get('/meta/roles', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const roles = Object.values(auth_1.UserRole).map(r => ({ value: r, label: r }));
    res.json({ success: true, data: { roles } });
}));
// ============================================
// Get Invoice Numbering Preview
// ============================================
router.get('/invoice-preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const shop = await index_1.prisma.shop.findUnique({
        where: { id: shopId },
        select: { invoicePrefix: true, purchasePrefix: true },
    });
    if (!shop)
        throw new errorHandler_1.NotFoundError('Shop');
    const lastInvoice = await index_1.prisma.salesInvoice.findFirst({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
    });
    const lastPurchase = await index_1.prisma.purchase.findFirst({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
    });
    const nextInvoiceSeq = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1 : 1;
    const nextPurchaseSeq = lastPurchase ? parseInt(lastPurchase.invoiceNumber.replace(/\D/g, '')) + 1 : 1;
    res.json({
        success: true,
        data: {
            nextInvoiceNumber: `${shop.invoicePrefix}${nextInvoiceSeq.toString().padStart(6, '0')}`,
            nextPurchaseNumber: `${shop.purchasePrefix}${nextPurchaseSeq.toString().padStart(6, '0')}`,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=settings.js.map