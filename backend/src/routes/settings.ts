/**
 * Settings Routes
 * Shop settings, tax configuration, user preferences
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS, UserRole } from '../middleware/auth';
import { logUpdate } from '../middleware/requestLogger';
import { TaxType, UnitOfMeasure, PaymentMethod } from '@shopstock/shared/constants';
import { formatCurrency, toMinorUnits } from '@shopstock/shared/utils';

const router = Router();

// ============================================
// Get Shop Settings
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const shop = await prisma.shop.findUnique({
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

  if (!shop) throw new NotFoundError('Shop');

  res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings, currency: shop.currency, timezone: shop.timezone, invoicePrefix: shop.invoicePrefix, purchasePrefix: shop.purchasePrefix } });
}));

// ============================================
// Update Shop Settings
// ============================================

router.put('/', requirePermission('MANAGE_SETTINGS'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { settings, taxSettings, currency, timezone, invoicePrefix, purchasePrefix } = req.body;

  const updateData: any = {};
  if (settings) updateData.settings = settings;
  if (taxSettings) updateData.taxSettings = taxSettings;
  if (currency) updateData.currency = currency;
  if (timezone) updateData.timezone = timezone;
  if (invoicePrefix) updateData.invoicePrefix = invoicePrefix;
  if (purchasePrefix) updateData.purchasePrefix = purchasePrefix;

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: updateData,
    select: { taxSettings: true, settings: true, currency: true, timezone: true, invoicePrefix: true, purchasePrefix: true },
  });

  logUpdate(req, 'ShopSettings', shopId, {}, updateData);

  res.json({ success: true, data: { settings: shop.settings, taxSettings: shop.taxSettings, currency: shop.currency, timezone: shop.timezone, invoicePrefix: shop.invoicePrefix, purchasePrefix: shop.purchasePrefix } });
}));

// ============================================
// Get User Preferences
// ============================================

router.get('/preferences', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id;

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

router.put('/preferences', asyncHandler(async (req, res) => {
  const userId = (req as any).user?.id;
  const { preferences } = req.body;

  // In a real app, save to UserPreferences table
  // For now, just return success
  res.json({ success: true, data: { message: 'Preferences updated', preferences } });
}));

// ============================================
// Get Tax Types Reference
// ============================================

router.get('/meta/tax-types', asyncHandler(async (req, res) => {
  const types = Object.values(TaxType).map(t => ({ value: t, label: t }));
  res.json({ success: true, data: { types } });
}));

// ============================================
// Get Units of Measure Reference
// ============================================

router.get('/meta/units', asyncHandler(async (req, res) => {
  const units = Object.values(UnitOfMeasure).map(u => ({ value: u, label: u }));
  res.json({ success: true, data: { units } });
}));

// ============================================
// Get Payment Methods Reference
// ============================================

router.get('/meta/payment-methods', asyncHandler(async (req, res) => {
  const methods = Object.values(PaymentMethod).map(m => ({ value: m, label: m }));
  res.json({ success: true, data: { methods } });
}));

// ============================================
// Get Roles Reference
// ============================================

router.get('/meta/roles', asyncHandler(async (req, res) => {
  const roles = Object.values(UserRole).map(r => ({ value: r, label: r }));
  res.json({ success: true, data: { roles } });
}));

// ============================================
// Get Invoice Numbering Preview
// ============================================

router.get('/invoice-preview', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { invoicePrefix: true, purchasePrefix: true },
  });

  if (!shop) throw new NotFoundError('Shop');

  const lastInvoice = await prisma.salesInvoice.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastPurchase = await prisma.purchase.findFirst({
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

export default router;