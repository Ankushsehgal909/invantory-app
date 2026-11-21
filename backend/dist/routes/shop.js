"use strict";
/**
 * Shop Routes
 * Shop profile and settings management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("@shopstock/shared/validators");
const constants_1 = require("@shopstock/shared/constants");
const requestLogger_1 = require("../middleware/requestLogger");
const router = (0, express_1.Router)();
// ============================================
// Get Shop Profile
// ============================================
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const shop = await index_1.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            logo: true,
            currency: true,
            timezone: true,
            invoicePrefix: true,
            purchasePrefix: true,
            taxSettings: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!shop) {
        throw new errorHandler_1.NotFoundError('Shop');
    }
    res.json({ success: true, data: { shop } });
}));
// ============================================
// Update Shop Profile
// ============================================
router.put('/profile', (0, auth_1.requirePermission)('MANAGE_SHOP'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const validation = validators_1.updateShopSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    // Convert address object to JSON string
    const updateData = { ...validation.data };
    if (updateData.address) {
        updateData.address = JSON.stringify(updateData.address);
    }
    const shop = await index_1.prisma.shop.update({
        where: { id: shopId },
        data: updateData,
        select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            logo: true,
            currency: true,
            timezone: true,
            invoicePrefix: true,
            purchasePrefix: true,
            taxSettings: true,
            settings: true,
            updatedAt: true,
        },
    });
    (0, requestLogger_1.logUpdate)(req, 'Shop', shopId, {}, validation.data);
    res.json({ success: true, data: { shop } });
}));
// ============================================
// Get Shop Settings
// ============================================
router.get('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const shop = await index_1.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
            taxSettings: true,
            settings: true,
        },
    });
    if (!shop) {
        throw new errorHandler_1.NotFoundError('Shop');
    }
    res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings } });
}));
// ============================================
// Update Shop Settings
// ============================================
router.put('/settings', (0, auth_1.requirePermission)('MANAGE_SETTINGS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { settings, taxSettings } = req.body;
    const shop = await index_1.prisma.shop.update({
        where: { id: shopId },
        data: {
            ...(settings && { settings }),
            ...(taxSettings && { taxSettings }),
        },
        select: {
            taxSettings: true,
            settings: true,
            updatedAt: true,
        },
    });
    (0, requestLogger_1.logUpdate)(req, 'ShopSettings', shopId, {}, { settings, taxSettings });
    res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings } });
}));
// ============================================
// Create Shop (Owner only - for initial setup)
// ============================================
router.post('/', (0, auth_1.requireRole)(constants_1.UserRole.OWNER), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validation = validators_1.createShopSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const userId = req.user?.id;
    // Check if user already has a shop
    const existingShop = await index_1.prisma.shop.findFirst({
        where: { users: { some: { id: userId } } },
    });
    if (existingShop) {
        throw new errorHandler_1.ValidationError('User already has a shop');
    }
    // Convert address object to JSON string
    const createData = { ...validation.data };
    if (createData.address) {
        createData.address = JSON.stringify(createData.address);
    }
    const shop = await index_1.prisma.shop.create({
        data: {
            ...createData,
            users: { connect: { id: userId } },
        },
    });
    (0, requestLogger_1.logCreate)(req, 'Shop', shop.id, validation.data);
    res.status(201).json({ success: true, data: { shop } });
}));
// ============================================
// Get Shop Statistics
// ============================================
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const [totalProducts, totalCategories, totalSuppliers, totalCustomers, totalSales, totalPurchases, lowStockCount, outOfStockCount,] = await Promise.all([
        index_1.prisma.product.count({ where: { shopId, status: 'ACTIVE' } }),
        index_1.prisma.category.count({ where: { shopId, isActive: true } }),
        index_1.prisma.supplier.count({ where: { shopId, isActive: true } }),
        index_1.prisma.customer.count({ where: { shopId, isActive: true } }),
        index_1.prisma.salesInvoice.count({ where: { shopId } }),
        index_1.prisma.purchase.count({ where: { shopId } }),
        index_1.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "Product"
      WHERE "shopId" = $1
        AND "status" = 'ACTIVE'
        AND "currentStock" > 0
        AND "currentStock" <= "reorderLevel"
    `, shopId).then((result) => Number(result[0]?.count || 0)),
        index_1.prisma.product.count({
            where: { shopId, status: 'ACTIVE', currentStock: { lte: 0 } },
        }),
    ]);
    res.json({
        success: true,
        data: {
            stats: {
                totalProducts,
                totalCategories,
                totalSuppliers,
                totalCustomers,
                totalSales,
                totalPurchases,
                lowStockCount,
                outOfStockCount,
            },
        },
    });
}));
exports.default = router;
//# sourceMappingURL=shop.js.map