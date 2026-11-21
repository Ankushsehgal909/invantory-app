/**
 * Shop Routes
 * Shop profile and settings management
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { requireRole, requirePermission, PERMISSIONS } from '../middleware/auth';
import { createShopSchema, updateShopSchema } from '@shopstock/shared/validators';
import { UserRole } from '@shopstock/shared/constants';
import { logCreate, logUpdate } from '../middleware/requestLogger';

const router = Router();

// ============================================
// Get Shop Profile
// ============================================

router.get('/profile', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const shop = await prisma.shop.findUnique({
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
    throw new NotFoundError('Shop');
  }

  res.json({ success: true, data: { shop } });
}));

// ============================================
// Update Shop Profile
// ============================================

router.put('/profile', requirePermission('MANAGE_SHOP'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const validation = updateShopSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  // Convert address object to JSON string
  const updateData: any = { ...validation.data };
  if (updateData.address) {
    updateData.address = JSON.stringify(updateData.address);
  }

  const shop = await prisma.shop.update({
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

  logUpdate(req, 'Shop', shopId, {}, validation.data);

  res.json({ success: true, data: { shop } });
}));

// ============================================
// Get Shop Settings
// ============================================

router.get('/settings', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      taxSettings: true,
      settings: true,
    },
  });

  if (!shop) {
    throw new NotFoundError('Shop');
  }

  res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings } });
}));

// ============================================
// Update Shop Settings
// ============================================

router.put('/settings', requirePermission('MANAGE_SETTINGS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { settings, taxSettings } = req.body;

  const shop = await prisma.shop.update({
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

  logUpdate(req, 'ShopSettings', shopId, {}, { settings, taxSettings });

  res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings } });
}));

// ============================================
// Create Shop (Owner only - for initial setup)
// ============================================

router.post('/', requireRole(UserRole.OWNER), asyncHandler(async (req, res) => {
  const validation = createShopSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const userId = (req as any).user?.id;

  // Check if user already has a shop
  const existingShop = await prisma.shop.findFirst({
    where: { users: { some: { id: userId } } },
  });

  if (existingShop) {
    throw new ValidationError('User already has a shop');
  }

  // Convert address object to JSON string
  const createData: any = { ...validation.data };
  if (createData.address) {
    createData.address = JSON.stringify(createData.address);
  }

  const shop = await prisma.shop.create({
    data: {
      ...createData,
      users: { connect: { id: userId } },
    },
  });

  logCreate(req, 'Shop', shop.id, validation.data);

  res.status(201).json({ success: true, data: { shop } });
}));

// ============================================
// Get Shop Statistics
// ============================================

router.get('/stats', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const [
    totalProducts,
    totalCategories,
    totalSuppliers,
    totalCustomers,
    totalSales,
    totalPurchases,
    lowStockCount,
    outOfStockCount,
  ] = await Promise.all([
    prisma.product.count({ where: { shopId, status: 'ACTIVE' } }),
    prisma.category.count({ where: { shopId, isActive: true } }),
    prisma.supplier.count({ where: { shopId, isActive: true } }),
    prisma.customer.count({ where: { shopId, isActive: true } }),
    prisma.salesInvoice.count({ where: { shopId } }),
    prisma.purchase.count({ where: { shopId } }),
    (prisma as any).$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "Product"
      WHERE "shopId" = $1
        AND "status" = 'ACTIVE'
        AND "currentStock" > 0
        AND "currentStock" <= "reorderLevel"
    `, shopId).then((result: any) => Number(result[0]?.count || 0)),
    prisma.product.count({
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

export default router;