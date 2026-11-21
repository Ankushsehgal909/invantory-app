/**
 * Shared Validators for ShopStock
 * Using Zod for schema validation
 */
import { z } from 'zod';
import { UserRole, UserStatus, ProductStatus, ExpiryMode, UnitOfMeasure, MovementType, AdjustmentReason, PaymentStatus, PaymentMethod, InvoiceStatus, DiscountType, TaxType, PartyType, LedgerEntryType, ReferenceType, } from '../types';
// ============================================
// Primitive Validators
// ============================================
export const minorUnitsSchema = z.number().int().min(0).describe('Amount in minor currency units (paise)');
export const positiveMinorUnitsSchema = z.number().int().positive().describe('Positive amount in minor currency units');
export const nonNegativeMinorUnitsSchema = z.number().int().min(0).describe('Non-negative amount in minor currency units');
export const percentageSchema = z.number().min(0).max(100).describe('Percentage value (0-100)');
export const quantitySchema = z.number().positive().describe('Positive quantity');
export const nonNegativeQuantitySchema = z.number().min(0).describe('Non-negative quantity');
export const idSchema = z.string().uuid().describe('UUID identifier');
export const shopIdSchema = z.string().uuid().describe('Shop UUID');
export const userIdSchema = z.string().uuid().describe('User UUID');
export const productIdSchema = z.string().uuid().describe('Product UUID');
export const batchIdSchema = z.string().uuid().describe('Batch UUID');
export const categoryIdSchema = z.string().uuid().describe('Category UUID');
export const supplierIdSchema = z.string().uuid().describe('Supplier UUID');
export const customerIdSchema = z.string().uuid().describe('Customer UUID');
export const invoiceIdSchema = z.string().uuid().describe('Invoice UUID');
export const purchaseIdSchema = z.string().uuid().describe('Purchase UUID');
// ============================================
// String Validators
// ============================================
export const nonEmptyStringSchema = z.string().min(1).max(500).describe('Non-empty string');
export const productNameSchema = z.string().min(1).max(200).describe('Product name');
export const skuSchema = z.string().regex(/^[A-Z0-9\-_]{1,50}$/).describe('SKU (alphanumeric, hyphen, underscore)');
export const barcodeSchema = z.string().regex(/^[0-9]{8,14}$/).optional().describe('Barcode (8-14 digits)');
export const categoryNameSchema = z.string().min(1).max(100).describe('Category name');
export const phoneSchema = z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).describe('Phone number');
export const emailSchema = z.string().email().describe('Email address');
export const gstinSchema = z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().describe('GSTIN');
export const passwordSchema = z.string().min(8).max(128).describe('Password (min 8 chars)');
export const pinSchema = z.string().regex(/^[0-9]{4,6}$/).optional().describe('PIN (4-6 digits)');
// ============================================
// Date Validators
// ============================================
export const dateStringSchema = z.string().datetime().describe('ISO 8601 date string');
export const dateSchema = z.date().describe('Date object');
export const optionalDateSchema = z.date().optional().describe('Optional date');
// ============================================
// Enum Validators
// ============================================
export const userRoleSchema = z.nativeEnum(UserRole);
export const userStatusSchema = z.nativeEnum(UserStatus);
export const productStatusSchema = z.nativeEnum(ProductStatus);
export const expiryModeSchema = z.nativeEnum(ExpiryMode);
export const unitOfMeasureSchema = z.nativeEnum(UnitOfMeasure);
export const movementTypeSchema = z.nativeEnum(MovementType);
export const adjustmentReasonSchema = z.nativeEnum(AdjustmentReason);
export const paymentStatusSchema = z.nativeEnum(PaymentStatus);
export const paymentMethodSchema = z.nativeEnum(PaymentMethod);
export const invoiceStatusSchema = z.nativeEnum(InvoiceStatus);
export const discountTypeSchema = z.nativeEnum(DiscountType);
export const taxTypeSchema = z.nativeEnum(TaxType);
export const partyTypeSchema = z.nativeEnum(PartyType);
export const ledgerEntryTypeSchema = z.nativeEnum(LedgerEntryType);
export const referenceTypeSchema = z.nativeEnum(ReferenceType);
// ============================================
// Object Validators
// ============================================
// Pagination
export const paginationSchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
// Date Range
const dateRangeBaseSchema = z.object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
});
export const dateRangeSchema = dateRangeBaseSchema.refine(data => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
});
// Address
export const addressSchema = z.object({
    line1: z.string().max(200).optional(),
    line2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
});
// ============================================
// Shop Validators
// ============================================
export const taxSettingsSchema = z.object({
    enabled: z.boolean().default(false),
    taxType: taxTypeSchema.default(TaxType.NONE),
    defaultTaxRate: percentageSchema.default(0),
    taxInclusive: z.boolean().default(false),
    gstin: gstinSchema,
});
export const shopSettingsSchema = z.object({
    lowStockDefaultThreshold: z.number().int().min(0).default(10),
    expiryAlertDays: z.array(z.number().int().positive()).default([90, 30, 7, 1]),
    allowNegativeStock: z.boolean().default(false),
    defaultPaymentTerms: z.number().int().positive().default(30),
    enableBatchTracking: z.boolean().default(true),
    enableExpiryTracking: z.boolean().default(true),
    currencySymbol: z.string().default('₹'),
    dateFormat: z.string().default('dd/MM/yyyy'),
    numberFormat: z.string().default('en-IN'),
});
export const createShopSchema = z.object({
    name: z.string().min(1).max(200),
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    currency: z.string().length(3).default('INR'),
    timezone: z.string().default('Asia/Kolkata'),
    invoicePrefix: z.string().max(10).default('INV-'),
    purchasePrefix: z.string().max(10).default('PUR-'),
    taxSettings: taxSettingsSchema.optional(),
    settings: shopSettingsSchema.optional(),
});
export const updateShopSchema = createShopSchema.partial();
// ============================================
// User Validators
// ============================================
export const createUserSchema = z.object({
    shopId: shopIdSchema,
    name: z.string().min(1).max(100),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
    role: userRoleSchema.default(UserRole.STAFF),
    pin: pinSchema,
});
export const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    pin: pinSchema,
});
export const loginSchema = z.object({
    phone: phoneSchema,
    password: z.string().min(1),
    shopId: shopIdSchema.optional(),
});
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
});
// ============================================
// Category Validators
// ============================================
export const createCategorySchema = z.object({
    shopId: shopIdSchema,
    name: categoryNameSchema,
    description: z.string().max(500).optional(),
    parentId: categoryIdSchema.optional(),
});
export const updateCategorySchema = createCategorySchema.partial().omit({ shopId: true });
// ============================================
// Product Validators
// ============================================
const createProductBaseSchema = z.object({
    shopId: shopIdSchema,
    name: productNameSchema,
    sku: skuSchema,
    barcode: barcodeSchema,
    categoryId: categoryIdSchema.optional(),
    brand: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    unit: unitOfMeasureSchema,
    purchaseCost: minorUnitsSchema,
    sellingPrice: minorUnitsSchema,
    taxRate: percentageSchema.optional(),
    reorderLevel: z.number().int().min(0).default(0),
    openingStock: nonNegativeQuantitySchema.default(0),
    expiryMode: expiryModeSchema.default(ExpiryMode.NONE),
    imageUrl: z.string().url().optional(),
    weight: z.number().positive().optional(),
    conversionFactor: z.number().positive().optional(),
    baseUnit: unitOfMeasureSchema.optional(),
});
export const createProductSchema = createProductBaseSchema.refine(data => {
    if (data.conversionFactor && !data.baseUnit) {
        return false;
    }
    return true;
}, {
    message: 'baseUnit is required when conversionFactor is provided',
    path: ['baseUnit'],
});
export const updateProductSchema = createProductBaseSchema.partial().omit({ shopId: true }).extend({
    status: productStatusSchema.optional(),
});
// Product filters
export const productFiltersSchema = paginationSchema.extend({
    search: z.string().optional(),
    categoryId: categoryIdSchema.optional(),
    status: productStatusSchema.optional(),
    expiryMode: expiryModeSchema.optional(),
    lowStock: z.boolean().optional(),
    outOfStock: z.boolean().optional(),
    archived: z.boolean().optional(),
});
// ============================================
// Batch Validators
// ============================================
export const createBatchSchema = z.object({
    productId: productIdSchema,
    batchNumber: z.string().min(1).max(50),
    purchaseDate: dateStringSchema,
    expiryDate: dateStringSchema.optional(),
    quantityReceived: quantitySchema,
    quantityAvailable: quantitySchema,
    unitCost: minorUnitsSchema,
    supplierId: supplierIdSchema.optional(),
    purchaseId: purchaseIdSchema.optional(),
});
export const updateBatchSchema = createBatchSchema.partial().omit({ productId: true });
// ============================================
// Supplier Validators
// ============================================
export const createSupplierSchema = z.object({
    shopId: shopIdSchema,
    name: z.string().min(1).max(200),
    contactPerson: z.string().max(100).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: addressSchema.optional(),
    gstin: gstinSchema,
    notes: z.string().max(1000).optional(),
    openingBalance: minorUnitsSchema.default(0),
});
export const updateSupplierSchema = createSupplierSchema.partial().omit({ shopId: true });
// ============================================
// Customer Validators
// ============================================
export const createCustomerSchema = z.object({
    shopId: shopIdSchema,
    businessName: z.string().min(1).max(200),
    contactPerson: z.string().max(100).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    billingAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),
    gstin: gstinSchema,
    notes: z.string().max(1000).optional(),
    openingBalance: minorUnitsSchema.default(0),
    creditLimit: minorUnitsSchema.optional(),
    paymentTerms: z.number().int().positive().default(30),
});
export const updateCustomerSchema = createCustomerSchema.partial().omit({ shopId: true });
// ============================================
// Purchase Validators
// ============================================
export const createPurchaseItemSchema = z.object({
    productId: productIdSchema,
    quantity: quantitySchema,
    unit: unitOfMeasureSchema,
    unitCost: minorUnitsSchema,
    discount: nonNegativeMinorUnitsSchema.default(0),
    tax: nonNegativeMinorUnitsSchema.default(0),
    batchNumber: z.string().max(50).optional(),
    expiryDate: dateStringSchema.optional(),
});
export const createPurchaseSchema = z.object({
    shopId: shopIdSchema,
    supplierId: supplierIdSchema.optional(),
    supplierInvoiceNumber: z.string().max(100).optional(),
    purchaseDate: dateStringSchema,
    items: z.array(createPurchaseItemSchema).min(1),
    discount: nonNegativeMinorUnitsSchema.default(0),
    tax: nonNegativeMinorUnitsSchema.default(0),
    additionalCharges: nonNegativeMinorUnitsSchema.default(0),
    amountPaid: nonNegativeMinorUnitsSchema.default(0),
    paymentMethod: paymentMethodSchema.optional(),
    notes: z.string().max(1000).optional(),
});
export const updatePurchaseSchema = createPurchaseSchema.partial().omit({ shopId: true }).extend({
    status: invoiceStatusSchema.optional(),
});
// ============================================
// Sales Invoice Validators
// ============================================
export const createSalesInvoiceItemSchema = z.object({
    productId: productIdSchema,
    quantity: quantitySchema,
    unit: unitOfMeasureSchema,
    unitPrice: minorUnitsSchema,
    discount: nonNegativeMinorUnitsSchema.default(0),
    discountType: discountTypeSchema.default(DiscountType.FIXED),
    tax: nonNegativeMinorUnitsSchema.default(0),
    batchId: batchIdSchema.optional(),
});
const createSalesInvoiceBaseSchema = z.object({
    shopId: shopIdSchema,
    customerId: customerIdSchema.optional(),
    invoiceDate: dateStringSchema,
    dueDate: dateStringSchema.optional(),
    items: z.array(createSalesInvoiceItemSchema).min(1),
    discount: nonNegativeMinorUnitsSchema.default(0),
    discountType: discountTypeSchema.default(DiscountType.FIXED),
    tax: nonNegativeMinorUnitsSchema.default(0),
    additionalCharges: nonNegativeMinorUnitsSchema.default(0),
    roundingAdjustment: z.number().default(0),
    amountPaid: nonNegativeMinorUnitsSchema.default(0),
    paymentMethod: paymentMethodSchema.optional(),
    notes: z.string().max(1000).optional(),
    terms: z.string().max(1000).optional(),
});
export const createSalesInvoiceSchema = createSalesInvoiceBaseSchema.refine(data => {
    if (data.dueDate && new Date(data.dueDate) < new Date(data.invoiceDate)) {
        return false;
    }
    return true;
}, {
    message: 'Due date must be after or equal to invoice date',
    path: ['dueDate'],
});
export const updateSalesInvoiceSchema = createSalesInvoiceBaseSchema.partial().omit({ shopId: true }).extend({
    status: invoiceStatusSchema.optional(),
});
// ============================================
// Stock Adjustment Validators
// ============================================
export const createStockAdjustmentSchema = z.object({
    shopId: shopIdSchema,
    productId: productIdSchema,
    batchId: batchIdSchema.optional(),
    movementType: movementTypeSchema,
    quantityDelta: z.number().int().describe('Positive for stock in, negative for stock out'),
    reason: adjustmentReasonSchema,
    notes: z.string().max(500).optional(),
}).refine(data => {
    // Adjustment reasons should match movement type
    const stockOutReasons = [
        AdjustmentReason.DAMAGE,
        AdjustmentReason.EXPIRY_WRITE_OFF,
        AdjustmentReason.THEFT_LOSS,
        AdjustmentReason.INTERNAL_USE,
        AdjustmentReason.COUNTING_CORRECTION,
    ];
    const stockInReasons = [
        AdjustmentReason.OPENING_BALANCE_CORRECTION,
        AdjustmentReason.FOUND_STOCK,
    ];
    if (data.quantityDelta < 0 && !stockOutReasons.includes(data.reason)) {
        return false;
    }
    if (data.quantityDelta > 0 && !stockInReasons.includes(data.reason)) {
        return false;
    }
    return true;
}, {
    message: 'Movement type and reason mismatch',
    path: ['reason'],
});
// ============================================
// Payment Validators
// ============================================
export const createPaymentSchema = z.object({
    shopId: shopIdSchema,
    partyType: partyTypeSchema,
    partyId: z.string().uuid(),
    referenceType: referenceTypeSchema,
    referenceId: z.string().uuid(),
    amount: positiveMinorUnitsSchema,
    method: paymentMethodSchema,
    paidAt: dateStringSchema,
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
});
// ============================================
// Credit Note Validators
// ============================================
export const createCreditNoteSchema = z.object({
    shopId: shopIdSchema,
    invoiceId: invoiceIdSchema,
    customerId: customerIdSchema,
    amount: positiveMinorUnitsSchema,
    reason: z.string().min(1).max(500),
});
// ============================================
// Report Validators
// ============================================
export const stockReportFiltersSchema = dateRangeBaseSchema.extend({
    categoryId: categoryIdSchema.optional(),
    productId: productIdSchema.optional(),
    lowStockOnly: z.boolean().optional(),
    outOfStockOnly: z.boolean().optional(),
    includeArchived: z.boolean().default(false),
});
export const salesReportFiltersSchema = dateRangeBaseSchema.extend({
    customerId: customerIdSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    minAmount: minorUnitsSchema.optional(),
    maxAmount: minorUnitsSchema.optional(),
});
export const purchaseReportFiltersSchema = dateRangeBaseSchema.extend({
    supplierId: supplierIdSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    minAmount: minorUnitsSchema.optional(),
    maxAmount: minorUnitsSchema.optional(),
});
export const expiryReportFiltersSchema = z.object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    categoryId: categoryIdSchema.optional(),
    productId: productIdSchema.optional(),
    status: z.enum(['EXPIRED', 'EXPIRING_SOON', 'NO_EXPIRY']).optional(),
});
export const receivablesReportFiltersSchema = z.object({
    customerId: customerIdSchema.optional(),
    minOutstanding: minorUnitsSchema.optional(),
    maxOutstanding: minorUnitsSchema.optional(),
    ageingBucket: z.enum(['NOT_DUE', '1_30', '31_60', '61_90', '90_PLUS']).optional(),
});
// ============================================
// Import/Export Validators
// ============================================
export const exportOptionsSchema = z.object({
    format: z.enum(['csv', 'pdf', 'excel']),
    dateRange: dateRangeSchema.optional(),
    fields: z.array(z.string()).optional(),
    filters: z.record(z.unknown()).optional(),
});
// ============================================
// Idempotency Key Validator
// ============================================
export const idempotencyKeySchema = z.string().uuid().describe('Idempotency key for retry-safe operations');
// ============================================
// Validation Helper Functions
// ============================================
export function validate(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
export function validateOrThrow(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new Error(`Validation failed: ${result.error.message}`);
    }
    return result.data;
}
//# sourceMappingURL=index.js.map