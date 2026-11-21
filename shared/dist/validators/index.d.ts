/**
 * Shared Validators for ShopStock
 * Using Zod for schema validation
 */
import { z } from 'zod';
import { UserRole, UserStatus, ProductStatus, ExpiryMode, UnitOfMeasure, MovementType, AdjustmentReason, PaymentStatus, PaymentMethod, InvoiceStatus, DiscountType, TaxType, PartyType, LedgerEntryType, ReferenceType } from '../types';
export declare const minorUnitsSchema: z.ZodNumber;
export declare const positiveMinorUnitsSchema: z.ZodNumber;
export declare const nonNegativeMinorUnitsSchema: z.ZodNumber;
export declare const percentageSchema: z.ZodNumber;
export declare const quantitySchema: z.ZodNumber;
export declare const nonNegativeQuantitySchema: z.ZodNumber;
export declare const idSchema: z.ZodString;
export declare const shopIdSchema: z.ZodString;
export declare const userIdSchema: z.ZodString;
export declare const productIdSchema: z.ZodString;
export declare const batchIdSchema: z.ZodString;
export declare const categoryIdSchema: z.ZodString;
export declare const supplierIdSchema: z.ZodString;
export declare const customerIdSchema: z.ZodString;
export declare const invoiceIdSchema: z.ZodString;
export declare const purchaseIdSchema: z.ZodString;
export declare const nonEmptyStringSchema: z.ZodString;
export declare const productNameSchema: z.ZodString;
export declare const skuSchema: z.ZodString;
export declare const barcodeSchema: z.ZodOptional<z.ZodString>;
export declare const categoryNameSchema: z.ZodString;
export declare const phoneSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const gstinSchema: z.ZodOptional<z.ZodString>;
export declare const passwordSchema: z.ZodString;
export declare const pinSchema: z.ZodOptional<z.ZodString>;
export declare const dateStringSchema: z.ZodString;
export declare const dateSchema: z.ZodDate;
export declare const optionalDateSchema: z.ZodOptional<z.ZodDate>;
export declare const userRoleSchema: z.ZodNativeEnum<typeof UserRole>;
export declare const userStatusSchema: z.ZodNativeEnum<typeof UserStatus>;
export declare const productStatusSchema: z.ZodNativeEnum<typeof ProductStatus>;
export declare const expiryModeSchema: z.ZodNativeEnum<typeof ExpiryMode>;
export declare const unitOfMeasureSchema: z.ZodNativeEnum<typeof UnitOfMeasure>;
export declare const movementTypeSchema: z.ZodNativeEnum<typeof MovementType>;
export declare const adjustmentReasonSchema: z.ZodNativeEnum<typeof AdjustmentReason>;
export declare const paymentStatusSchema: z.ZodNativeEnum<typeof PaymentStatus>;
export declare const paymentMethodSchema: z.ZodNativeEnum<typeof PaymentMethod>;
export declare const invoiceStatusSchema: z.ZodNativeEnum<typeof InvoiceStatus>;
export declare const discountTypeSchema: z.ZodNativeEnum<typeof DiscountType>;
export declare const taxTypeSchema: z.ZodNativeEnum<typeof TaxType>;
export declare const partyTypeSchema: z.ZodNativeEnum<typeof PartyType>;
export declare const ledgerEntryTypeSchema: z.ZodNativeEnum<typeof LedgerEntryType>;
export declare const referenceTypeSchema: z.ZodNativeEnum<typeof ReferenceType>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export declare const dateRangeSchema: z.ZodEffects<z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
}, {
    startDate: string;
    endDate: string;
}>, {
    startDate: string;
    endDate: string;
}, {
    startDate: string;
    endDate: string;
}>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export declare const addressSchema: z.ZodObject<{
    line1: z.ZodOptional<z.ZodString>;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    line1?: string | undefined;
    line2?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    country?: string | undefined;
}, {
    line1?: string | undefined;
    line2?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    country?: string | undefined;
}>;
export declare const taxSettingsSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    taxType: z.ZodDefault<z.ZodNativeEnum<typeof TaxType>>;
    defaultTaxRate: z.ZodDefault<z.ZodNumber>;
    taxInclusive: z.ZodDefault<z.ZodBoolean>;
    gstin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    taxType: TaxType;
    defaultTaxRate: number;
    taxInclusive: boolean;
    gstin?: string | undefined;
}, {
    enabled?: boolean | undefined;
    taxType?: TaxType | undefined;
    defaultTaxRate?: number | undefined;
    taxInclusive?: boolean | undefined;
    gstin?: string | undefined;
}>;
export declare const shopSettingsSchema: z.ZodObject<{
    lowStockDefaultThreshold: z.ZodDefault<z.ZodNumber>;
    expiryAlertDays: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    allowNegativeStock: z.ZodDefault<z.ZodBoolean>;
    defaultPaymentTerms: z.ZodDefault<z.ZodNumber>;
    enableBatchTracking: z.ZodDefault<z.ZodBoolean>;
    enableExpiryTracking: z.ZodDefault<z.ZodBoolean>;
    currencySymbol: z.ZodDefault<z.ZodString>;
    dateFormat: z.ZodDefault<z.ZodString>;
    numberFormat: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lowStockDefaultThreshold: number;
    expiryAlertDays: number[];
    allowNegativeStock: boolean;
    defaultPaymentTerms: number;
    enableBatchTracking: boolean;
    enableExpiryTracking: boolean;
    currencySymbol: string;
    dateFormat: string;
    numberFormat: string;
}, {
    lowStockDefaultThreshold?: number | undefined;
    expiryAlertDays?: number[] | undefined;
    allowNegativeStock?: boolean | undefined;
    defaultPaymentTerms?: number | undefined;
    enableBatchTracking?: boolean | undefined;
    enableExpiryTracking?: boolean | undefined;
    currencySymbol?: string | undefined;
    dateFormat?: string | undefined;
    numberFormat?: string | undefined;
}>;
export declare const createShopSchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    invoicePrefix: z.ZodDefault<z.ZodString>;
    purchasePrefix: z.ZodDefault<z.ZodString>;
    taxSettings: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        taxType: z.ZodDefault<z.ZodNativeEnum<typeof TaxType>>;
        defaultTaxRate: z.ZodDefault<z.ZodNumber>;
        taxInclusive: z.ZodDefault<z.ZodBoolean>;
        gstin: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        taxType: TaxType;
        defaultTaxRate: number;
        taxInclusive: boolean;
        gstin?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        taxType?: TaxType | undefined;
        defaultTaxRate?: number | undefined;
        taxInclusive?: boolean | undefined;
        gstin?: string | undefined;
    }>>;
    settings: z.ZodOptional<z.ZodObject<{
        lowStockDefaultThreshold: z.ZodDefault<z.ZodNumber>;
        expiryAlertDays: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        allowNegativeStock: z.ZodDefault<z.ZodBoolean>;
        defaultPaymentTerms: z.ZodDefault<z.ZodNumber>;
        enableBatchTracking: z.ZodDefault<z.ZodBoolean>;
        enableExpiryTracking: z.ZodDefault<z.ZodBoolean>;
        currencySymbol: z.ZodDefault<z.ZodString>;
        dateFormat: z.ZodDefault<z.ZodString>;
        numberFormat: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lowStockDefaultThreshold: number;
        expiryAlertDays: number[];
        allowNegativeStock: boolean;
        defaultPaymentTerms: number;
        enableBatchTracking: boolean;
        enableExpiryTracking: boolean;
        currencySymbol: string;
        dateFormat: string;
        numberFormat: string;
    }, {
        lowStockDefaultThreshold?: number | undefined;
        expiryAlertDays?: number[] | undefined;
        allowNegativeStock?: boolean | undefined;
        defaultPaymentTerms?: number | undefined;
        enableBatchTracking?: boolean | undefined;
        enableExpiryTracking?: boolean | undefined;
        currencySymbol?: string | undefined;
        dateFormat?: string | undefined;
        numberFormat?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    currency: string;
    timezone: string;
    invoicePrefix: string;
    purchasePrefix: string;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    taxSettings?: {
        enabled: boolean;
        taxType: TaxType;
        defaultTaxRate: number;
        taxInclusive: boolean;
        gstin?: string | undefined;
    } | undefined;
    settings?: {
        lowStockDefaultThreshold: number;
        expiryAlertDays: number[];
        allowNegativeStock: boolean;
        defaultPaymentTerms: number;
        enableBatchTracking: boolean;
        enableExpiryTracking: boolean;
        currencySymbol: string;
        dateFormat: string;
        numberFormat: string;
    } | undefined;
}, {
    name: string;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    currency?: string | undefined;
    timezone?: string | undefined;
    invoicePrefix?: string | undefined;
    purchasePrefix?: string | undefined;
    taxSettings?: {
        enabled?: boolean | undefined;
        taxType?: TaxType | undefined;
        defaultTaxRate?: number | undefined;
        taxInclusive?: boolean | undefined;
        gstin?: string | undefined;
    } | undefined;
    settings?: {
        lowStockDefaultThreshold?: number | undefined;
        expiryAlertDays?: number[] | undefined;
        allowNegativeStock?: boolean | undefined;
        defaultPaymentTerms?: number | undefined;
        enableBatchTracking?: boolean | undefined;
        enableExpiryTracking?: boolean | undefined;
        currencySymbol?: string | undefined;
        dateFormat?: string | undefined;
        numberFormat?: string | undefined;
    } | undefined;
}>;
export declare const updateShopSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    invoicePrefix: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    purchasePrefix: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    taxSettings: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        taxType: z.ZodDefault<z.ZodNativeEnum<typeof TaxType>>;
        defaultTaxRate: z.ZodDefault<z.ZodNumber>;
        taxInclusive: z.ZodDefault<z.ZodBoolean>;
        gstin: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        taxType: TaxType;
        defaultTaxRate: number;
        taxInclusive: boolean;
        gstin?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        taxType?: TaxType | undefined;
        defaultTaxRate?: number | undefined;
        taxInclusive?: boolean | undefined;
        gstin?: string | undefined;
    }>>>;
    settings: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        lowStockDefaultThreshold: z.ZodDefault<z.ZodNumber>;
        expiryAlertDays: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        allowNegativeStock: z.ZodDefault<z.ZodBoolean>;
        defaultPaymentTerms: z.ZodDefault<z.ZodNumber>;
        enableBatchTracking: z.ZodDefault<z.ZodBoolean>;
        enableExpiryTracking: z.ZodDefault<z.ZodBoolean>;
        currencySymbol: z.ZodDefault<z.ZodString>;
        dateFormat: z.ZodDefault<z.ZodString>;
        numberFormat: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lowStockDefaultThreshold: number;
        expiryAlertDays: number[];
        allowNegativeStock: boolean;
        defaultPaymentTerms: number;
        enableBatchTracking: boolean;
        enableExpiryTracking: boolean;
        currencySymbol: string;
        dateFormat: string;
        numberFormat: string;
    }, {
        lowStockDefaultThreshold?: number | undefined;
        expiryAlertDays?: number[] | undefined;
        allowNegativeStock?: boolean | undefined;
        defaultPaymentTerms?: number | undefined;
        enableBatchTracking?: boolean | undefined;
        enableExpiryTracking?: boolean | undefined;
        currencySymbol?: string | undefined;
        dateFormat?: string | undefined;
        numberFormat?: string | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    currency?: string | undefined;
    timezone?: string | undefined;
    invoicePrefix?: string | undefined;
    purchasePrefix?: string | undefined;
    taxSettings?: {
        enabled: boolean;
        taxType: TaxType;
        defaultTaxRate: number;
        taxInclusive: boolean;
        gstin?: string | undefined;
    } | undefined;
    settings?: {
        lowStockDefaultThreshold: number;
        expiryAlertDays: number[];
        allowNegativeStock: boolean;
        defaultPaymentTerms: number;
        enableBatchTracking: boolean;
        enableExpiryTracking: boolean;
        currencySymbol: string;
        dateFormat: string;
        numberFormat: string;
    } | undefined;
}, {
    name?: string | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    currency?: string | undefined;
    timezone?: string | undefined;
    invoicePrefix?: string | undefined;
    purchasePrefix?: string | undefined;
    taxSettings?: {
        enabled?: boolean | undefined;
        taxType?: TaxType | undefined;
        defaultTaxRate?: number | undefined;
        taxInclusive?: boolean | undefined;
        gstin?: string | undefined;
    } | undefined;
    settings?: {
        lowStockDefaultThreshold?: number | undefined;
        expiryAlertDays?: number[] | undefined;
        allowNegativeStock?: boolean | undefined;
        defaultPaymentTerms?: number | undefined;
        enableBatchTracking?: boolean | undefined;
        enableExpiryTracking?: boolean | undefined;
        currencySymbol?: string | undefined;
        dateFormat?: string | undefined;
        numberFormat?: string | undefined;
    } | undefined;
}>;
export declare const createUserSchema: z.ZodObject<{
    shopId: z.ZodString;
    name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodNativeEnum<typeof UserRole>>;
    pin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    shopId: string;
    password: string;
    role: UserRole;
    phone?: string | undefined;
    email?: string | undefined;
    pin?: string | undefined;
}, {
    name: string;
    shopId: string;
    password: string;
    phone?: string | undefined;
    email?: string | undefined;
    role?: UserRole | undefined;
    pin?: string | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodNativeEnum<typeof UserRole>>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof UserStatus>>;
    pin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    status?: UserStatus | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    role?: UserRole | undefined;
    pin?: string | undefined;
}, {
    name?: string | undefined;
    status?: UserStatus | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    role?: UserRole | undefined;
    pin?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    phone: z.ZodString;
    password: z.ZodString;
    shopId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    password: string;
    shopId?: string | undefined;
}, {
    phone: string;
    password: string;
    shopId?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const createCategorySchema: z.ZodObject<{
    shopId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    shopId: string;
    description?: string | undefined;
    parentId?: string | undefined;
}, {
    name: string;
    shopId: string;
    description?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const updateCategorySchema: z.ZodObject<Omit<{
    shopId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "shopId">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    parentId?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const createProductSchema: z.ZodEffects<z.ZodObject<{
    shopId: z.ZodString;
    name: z.ZodString;
    sku: z.ZodString;
    barcode: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
    purchaseCost: z.ZodNumber;
    sellingPrice: z.ZodNumber;
    taxRate: z.ZodOptional<z.ZodNumber>;
    reorderLevel: z.ZodDefault<z.ZodNumber>;
    openingStock: z.ZodDefault<z.ZodNumber>;
    expiryMode: z.ZodDefault<z.ZodNativeEnum<typeof ExpiryMode>>;
    imageUrl: z.ZodOptional<z.ZodString>;
    weight: z.ZodOptional<z.ZodNumber>;
    conversionFactor: z.ZodOptional<z.ZodNumber>;
    baseUnit: z.ZodOptional<z.ZodNativeEnum<typeof UnitOfMeasure>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sku: string;
    unit: UnitOfMeasure;
    purchaseCost: number;
    sellingPrice: number;
    reorderLevel: number;
    openingStock: number;
    expiryMode: ExpiryMode;
    shopId: string;
    barcode?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    description?: string | undefined;
    taxRate?: number | undefined;
    imageUrl?: string | undefined;
    weight?: number | undefined;
    conversionFactor?: number | undefined;
    baseUnit?: UnitOfMeasure | undefined;
}, {
    name: string;
    sku: string;
    unit: UnitOfMeasure;
    purchaseCost: number;
    sellingPrice: number;
    shopId: string;
    barcode?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    description?: string | undefined;
    taxRate?: number | undefined;
    reorderLevel?: number | undefined;
    openingStock?: number | undefined;
    expiryMode?: ExpiryMode | undefined;
    imageUrl?: string | undefined;
    weight?: number | undefined;
    conversionFactor?: number | undefined;
    baseUnit?: UnitOfMeasure | undefined;
}>, {
    name: string;
    sku: string;
    unit: UnitOfMeasure;
    purchaseCost: number;
    sellingPrice: number;
    reorderLevel: number;
    openingStock: number;
    expiryMode: ExpiryMode;
    shopId: string;
    barcode?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    description?: string | undefined;
    taxRate?: number | undefined;
    imageUrl?: string | undefined;
    weight?: number | undefined;
    conversionFactor?: number | undefined;
    baseUnit?: UnitOfMeasure | undefined;
}, {
    name: string;
    sku: string;
    unit: UnitOfMeasure;
    purchaseCost: number;
    sellingPrice: number;
    shopId: string;
    barcode?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    description?: string | undefined;
    taxRate?: number | undefined;
    reorderLevel?: number | undefined;
    openingStock?: number | undefined;
    expiryMode?: ExpiryMode | undefined;
    imageUrl?: string | undefined;
    weight?: number | undefined;
    conversionFactor?: number | undefined;
    baseUnit?: UnitOfMeasure | undefined;
}>;
export declare const updateProductSchema: z.ZodObject<Omit<{
    shopId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    categoryId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    brand: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    unit: z.ZodOptional<z.ZodNativeEnum<typeof UnitOfMeasure>>;
    purchaseCost: z.ZodOptional<z.ZodNumber>;
    sellingPrice: z.ZodOptional<z.ZodNumber>;
    taxRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    reorderLevel: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    openingStock: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    expiryMode: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof ExpiryMode>>>;
    imageUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    weight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    conversionFactor: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    baseUnit: z.ZodOptional<z.ZodOptional<z.ZodNativeEnum<typeof UnitOfMeasure>>>;
}, "shopId"> & {
    status: z.ZodOptional<z.ZodNativeEnum<typeof ProductStatus>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    sku?: string | undefined;
    barcode?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    description?: string | undefined;
    unit?: UnitOfMeasure | undefined;
    purchaseCost?: number | undefined;
    sellingPrice?: number | undefined;
    taxRate?: number | undefined;
    reorderLevel?: number | undefined;
    openingStock?: number | undefined;
    expiryMode?: ExpiryMode | undefined;
    imageUrl?: string | undefined;
    weight?: number | undefined;
    conversionFactor?: number | undefined;
    baseUnit?: UnitOfMeasure | undefined;
    status?: ProductStatus | undefined;
}, {
    name?: string | undefined;
    sku?: string | undefined;
    barcode?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    description?: string | undefined;
    unit?: UnitOfMeasure | undefined;
    purchaseCost?: number | undefined;
    sellingPrice?: number | undefined;
    taxRate?: number | undefined;
    reorderLevel?: number | undefined;
    openingStock?: number | undefined;
    expiryMode?: ExpiryMode | undefined;
    imageUrl?: string | undefined;
    weight?: number | undefined;
    conversionFactor?: number | undefined;
    baseUnit?: UnitOfMeasure | undefined;
    status?: ProductStatus | undefined;
}>;
export declare const productFiltersSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
} & {
    search: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof ProductStatus>>;
    expiryMode: z.ZodOptional<z.ZodNativeEnum<typeof ExpiryMode>>;
    lowStock: z.ZodOptional<z.ZodBoolean>;
    outOfStock: z.ZodOptional<z.ZodBoolean>;
    archived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    categoryId?: string | undefined;
    expiryMode?: ExpiryMode | undefined;
    status?: ProductStatus | undefined;
    lowStock?: boolean | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    search?: string | undefined;
    outOfStock?: boolean | undefined;
    archived?: boolean | undefined;
}, {
    categoryId?: string | undefined;
    expiryMode?: ExpiryMode | undefined;
    status?: ProductStatus | undefined;
    lowStock?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    search?: string | undefined;
    outOfStock?: boolean | undefined;
    archived?: boolean | undefined;
}>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export declare const createBatchSchema: z.ZodObject<{
    productId: z.ZodString;
    batchNumber: z.ZodString;
    purchaseDate: z.ZodString;
    expiryDate: z.ZodOptional<z.ZodString>;
    quantityReceived: z.ZodNumber;
    quantityAvailable: z.ZodNumber;
    unitCost: z.ZodNumber;
    supplierId: z.ZodOptional<z.ZodString>;
    purchaseId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    batchNumber: string;
    purchaseDate: string;
    quantityReceived: number;
    quantityAvailable: number;
    unitCost: number;
    expiryDate?: string | undefined;
    supplierId?: string | undefined;
    purchaseId?: string | undefined;
}, {
    productId: string;
    batchNumber: string;
    purchaseDate: string;
    quantityReceived: number;
    quantityAvailable: number;
    unitCost: number;
    expiryDate?: string | undefined;
    supplierId?: string | undefined;
    purchaseId?: string | undefined;
}>;
export declare const updateBatchSchema: z.ZodObject<Omit<{
    productId: z.ZodOptional<z.ZodString>;
    batchNumber: z.ZodOptional<z.ZodString>;
    purchaseDate: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    quantityReceived: z.ZodOptional<z.ZodNumber>;
    quantityAvailable: z.ZodOptional<z.ZodNumber>;
    unitCost: z.ZodOptional<z.ZodNumber>;
    supplierId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    purchaseId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "productId">, "strip", z.ZodTypeAny, {
    batchNumber?: string | undefined;
    purchaseDate?: string | undefined;
    expiryDate?: string | undefined;
    quantityReceived?: number | undefined;
    quantityAvailable?: number | undefined;
    unitCost?: number | undefined;
    supplierId?: string | undefined;
    purchaseId?: string | undefined;
}, {
    batchNumber?: string | undefined;
    purchaseDate?: string | undefined;
    expiryDate?: string | undefined;
    quantityReceived?: number | undefined;
    quantityAvailable?: number | undefined;
    unitCost?: number | undefined;
    supplierId?: string | undefined;
    purchaseId?: string | undefined;
}>;
export declare const createSupplierSchema: z.ZodObject<{
    shopId: z.ZodString;
    name: z.ZodString;
    contactPerson: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>;
    gstin: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    openingBalance: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    shopId: string;
    openingBalance: number;
    gstin?: string | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
}, {
    name: string;
    shopId: string;
    gstin?: string | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    openingBalance?: number | undefined;
}>;
export declare const updateSupplierSchema: z.ZodObject<Omit<{
    shopId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    contactPerson: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>>;
    gstin: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    openingBalance: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "shopId">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    gstin?: string | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    openingBalance?: number | undefined;
}, {
    name?: string | undefined;
    gstin?: string | undefined;
    address?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    openingBalance?: number | undefined;
}>;
export declare const createCustomerSchema: z.ZodObject<{
    shopId: z.ZodString;
    businessName: z.ZodString;
    contactPerson: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    billingAddress: z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>;
    shippingAddress: z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>;
    gstin: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    openingBalance: z.ZodDefault<z.ZodNumber>;
    creditLimit: z.ZodOptional<z.ZodNumber>;
    paymentTerms: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    shopId: string;
    openingBalance: number;
    businessName: string;
    paymentTerms: number;
    gstin?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    billingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    shippingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    creditLimit?: number | undefined;
}, {
    shopId: string;
    businessName: string;
    gstin?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    openingBalance?: number | undefined;
    billingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    shippingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    creditLimit?: number | undefined;
    paymentTerms?: number | undefined;
}>;
export declare const updateCustomerSchema: z.ZodObject<Omit<{
    shopId: z.ZodOptional<z.ZodString>;
    businessName: z.ZodOptional<z.ZodString>;
    contactPerson: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    billingAddress: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>>;
    shippingAddress: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }, {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    }>>>;
    gstin: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    openingBalance: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    creditLimit: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    paymentTerms: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "shopId">, "strip", z.ZodTypeAny, {
    gstin?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    openingBalance?: number | undefined;
    businessName?: string | undefined;
    billingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    shippingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    creditLimit?: number | undefined;
    paymentTerms?: number | undefined;
}, {
    gstin?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    contactPerson?: string | undefined;
    notes?: string | undefined;
    openingBalance?: number | undefined;
    businessName?: string | undefined;
    billingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    shippingAddress?: {
        line1?: string | undefined;
        line2?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    creditLimit?: number | undefined;
    paymentTerms?: number | undefined;
}>;
export declare const createPurchaseItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
    unitCost: z.ZodNumber;
    discount: z.ZodDefault<z.ZodNumber>;
    tax: z.ZodDefault<z.ZodNumber>;
    batchNumber: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    unit: UnitOfMeasure;
    productId: string;
    unitCost: number;
    quantity: number;
    discount: number;
    tax: number;
    batchNumber?: string | undefined;
    expiryDate?: string | undefined;
}, {
    unit: UnitOfMeasure;
    productId: string;
    unitCost: number;
    quantity: number;
    batchNumber?: string | undefined;
    expiryDate?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
}>;
export declare const createPurchaseSchema: z.ZodObject<{
    shopId: z.ZodString;
    supplierId: z.ZodOptional<z.ZodString>;
    supplierInvoiceNumber: z.ZodOptional<z.ZodString>;
    purchaseDate: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
        unitCost: z.ZodNumber;
        discount: z.ZodDefault<z.ZodNumber>;
        tax: z.ZodDefault<z.ZodNumber>;
        batchNumber: z.ZodOptional<z.ZodString>;
        expiryDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        discount: number;
        tax: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
    }, {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
        discount?: number | undefined;
        tax?: number | undefined;
    }>, "many">;
    discount: z.ZodDefault<z.ZodNumber>;
    tax: z.ZodDefault<z.ZodNumber>;
    additionalCharges: z.ZodDefault<z.ZodNumber>;
    amountPaid: z.ZodDefault<z.ZodNumber>;
    paymentMethod: z.ZodOptional<z.ZodNativeEnum<typeof PaymentMethod>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shopId: string;
    purchaseDate: string;
    discount: number;
    tax: number;
    items: {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        discount: number;
        tax: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
    }[];
    additionalCharges: number;
    amountPaid: number;
    supplierId?: string | undefined;
    notes?: string | undefined;
    supplierInvoiceNumber?: string | undefined;
    paymentMethod?: PaymentMethod | undefined;
}, {
    shopId: string;
    purchaseDate: string;
    items: {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
        discount?: number | undefined;
        tax?: number | undefined;
    }[];
    supplierId?: string | undefined;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    supplierInvoiceNumber?: string | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
}>;
export declare const updatePurchaseSchema: z.ZodObject<Omit<{
    shopId: z.ZodOptional<z.ZodString>;
    supplierId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    supplierInvoiceNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    purchaseDate: z.ZodOptional<z.ZodString>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
        unitCost: z.ZodNumber;
        discount: z.ZodDefault<z.ZodNumber>;
        tax: z.ZodDefault<z.ZodNumber>;
        batchNumber: z.ZodOptional<z.ZodString>;
        expiryDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        discount: number;
        tax: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
    }, {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
        discount?: number | undefined;
        tax?: number | undefined;
    }>, "many">>;
    discount: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    tax: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    additionalCharges: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    amountPaid: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    paymentMethod: z.ZodOptional<z.ZodOptional<z.ZodNativeEnum<typeof PaymentMethod>>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "shopId"> & {
    status: z.ZodOptional<z.ZodNativeEnum<typeof InvoiceStatus>>;
}, "strip", z.ZodTypeAny, {
    status?: InvoiceStatus | undefined;
    purchaseDate?: string | undefined;
    supplierId?: string | undefined;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    supplierInvoiceNumber?: string | undefined;
    items?: {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        discount: number;
        tax: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
    }[] | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
}, {
    status?: InvoiceStatus | undefined;
    purchaseDate?: string | undefined;
    supplierId?: string | undefined;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    supplierInvoiceNumber?: string | undefined;
    items?: {
        unit: UnitOfMeasure;
        productId: string;
        unitCost: number;
        quantity: number;
        batchNumber?: string | undefined;
        expiryDate?: string | undefined;
        discount?: number | undefined;
        tax?: number | undefined;
    }[] | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
}>;
export declare const createSalesInvoiceItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
    unitPrice: z.ZodNumber;
    discount: z.ZodDefault<z.ZodNumber>;
    discountType: z.ZodDefault<z.ZodNativeEnum<typeof DiscountType>>;
    tax: z.ZodDefault<z.ZodNumber>;
    batchId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    unit: UnitOfMeasure;
    productId: string;
    quantity: number;
    discount: number;
    tax: number;
    unitPrice: number;
    discountType: DiscountType;
    batchId?: string | undefined;
}, {
    unit: UnitOfMeasure;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number | undefined;
    tax?: number | undefined;
    discountType?: DiscountType | undefined;
    batchId?: string | undefined;
}>;
export declare const createSalesInvoiceSchema: z.ZodEffects<z.ZodObject<{
    shopId: z.ZodString;
    customerId: z.ZodOptional<z.ZodString>;
    invoiceDate: z.ZodString;
    dueDate: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
        unitPrice: z.ZodNumber;
        discount: z.ZodDefault<z.ZodNumber>;
        discountType: z.ZodDefault<z.ZodNativeEnum<typeof DiscountType>>;
        tax: z.ZodDefault<z.ZodNumber>;
        batchId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        discount: number;
        tax: number;
        unitPrice: number;
        discountType: DiscountType;
        batchId?: string | undefined;
    }, {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number | undefined;
        tax?: number | undefined;
        discountType?: DiscountType | undefined;
        batchId?: string | undefined;
    }>, "many">;
    discount: z.ZodDefault<z.ZodNumber>;
    discountType: z.ZodDefault<z.ZodNativeEnum<typeof DiscountType>>;
    tax: z.ZodDefault<z.ZodNumber>;
    additionalCharges: z.ZodDefault<z.ZodNumber>;
    roundingAdjustment: z.ZodDefault<z.ZodNumber>;
    amountPaid: z.ZodDefault<z.ZodNumber>;
    paymentMethod: z.ZodOptional<z.ZodNativeEnum<typeof PaymentMethod>>;
    notes: z.ZodOptional<z.ZodString>;
    terms: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shopId: string;
    discount: number;
    tax: number;
    items: {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        discount: number;
        tax: number;
        unitPrice: number;
        discountType: DiscountType;
        batchId?: string | undefined;
    }[];
    additionalCharges: number;
    amountPaid: number;
    discountType: DiscountType;
    invoiceDate: string;
    roundingAdjustment: number;
    notes?: string | undefined;
    paymentMethod?: PaymentMethod | undefined;
    customerId?: string | undefined;
    dueDate?: string | undefined;
    terms?: string | undefined;
}, {
    shopId: string;
    items: {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number | undefined;
        tax?: number | undefined;
        discountType?: DiscountType | undefined;
        batchId?: string | undefined;
    }[];
    invoiceDate: string;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
    discountType?: DiscountType | undefined;
    customerId?: string | undefined;
    dueDate?: string | undefined;
    roundingAdjustment?: number | undefined;
    terms?: string | undefined;
}>, {
    shopId: string;
    discount: number;
    tax: number;
    items: {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        discount: number;
        tax: number;
        unitPrice: number;
        discountType: DiscountType;
        batchId?: string | undefined;
    }[];
    additionalCharges: number;
    amountPaid: number;
    discountType: DiscountType;
    invoiceDate: string;
    roundingAdjustment: number;
    notes?: string | undefined;
    paymentMethod?: PaymentMethod | undefined;
    customerId?: string | undefined;
    dueDate?: string | undefined;
    terms?: string | undefined;
}, {
    shopId: string;
    items: {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number | undefined;
        tax?: number | undefined;
        discountType?: DiscountType | undefined;
        batchId?: string | undefined;
    }[];
    invoiceDate: string;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
    discountType?: DiscountType | undefined;
    customerId?: string | undefined;
    dueDate?: string | undefined;
    roundingAdjustment?: number | undefined;
    terms?: string | undefined;
}>;
export declare const updateSalesInvoiceSchema: z.ZodObject<Omit<{
    shopId: z.ZodOptional<z.ZodString>;
    customerId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    invoiceDate: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        unit: z.ZodNativeEnum<typeof UnitOfMeasure>;
        unitPrice: z.ZodNumber;
        discount: z.ZodDefault<z.ZodNumber>;
        discountType: z.ZodDefault<z.ZodNativeEnum<typeof DiscountType>>;
        tax: z.ZodDefault<z.ZodNumber>;
        batchId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        discount: number;
        tax: number;
        unitPrice: number;
        discountType: DiscountType;
        batchId?: string | undefined;
    }, {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number | undefined;
        tax?: number | undefined;
        discountType?: DiscountType | undefined;
        batchId?: string | undefined;
    }>, "many">>;
    discount: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    discountType: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof DiscountType>>>;
    tax: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    additionalCharges: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    roundingAdjustment: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    amountPaid: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    paymentMethod: z.ZodOptional<z.ZodOptional<z.ZodNativeEnum<typeof PaymentMethod>>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    terms: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "shopId"> & {
    status: z.ZodOptional<z.ZodNativeEnum<typeof InvoiceStatus>>;
}, "strip", z.ZodTypeAny, {
    status?: InvoiceStatus | undefined;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    items?: {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        discount: number;
        tax: number;
        unitPrice: number;
        discountType: DiscountType;
        batchId?: string | undefined;
    }[] | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
    discountType?: DiscountType | undefined;
    customerId?: string | undefined;
    invoiceDate?: string | undefined;
    dueDate?: string | undefined;
    roundingAdjustment?: number | undefined;
    terms?: string | undefined;
}, {
    status?: InvoiceStatus | undefined;
    notes?: string | undefined;
    discount?: number | undefined;
    tax?: number | undefined;
    items?: {
        unit: UnitOfMeasure;
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number | undefined;
        tax?: number | undefined;
        discountType?: DiscountType | undefined;
        batchId?: string | undefined;
    }[] | undefined;
    additionalCharges?: number | undefined;
    amountPaid?: number | undefined;
    paymentMethod?: PaymentMethod | undefined;
    discountType?: DiscountType | undefined;
    customerId?: string | undefined;
    invoiceDate?: string | undefined;
    dueDate?: string | undefined;
    roundingAdjustment?: number | undefined;
    terms?: string | undefined;
}>;
export declare const createStockAdjustmentSchema: z.ZodEffects<z.ZodObject<{
    shopId: z.ZodString;
    productId: z.ZodString;
    batchId: z.ZodOptional<z.ZodString>;
    movementType: z.ZodNativeEnum<typeof MovementType>;
    quantityDelta: z.ZodNumber;
    reason: z.ZodNativeEnum<typeof AdjustmentReason>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shopId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    reason: AdjustmentReason;
    notes?: string | undefined;
    batchId?: string | undefined;
}, {
    shopId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    reason: AdjustmentReason;
    notes?: string | undefined;
    batchId?: string | undefined;
}>, {
    shopId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    reason: AdjustmentReason;
    notes?: string | undefined;
    batchId?: string | undefined;
}, {
    shopId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    reason: AdjustmentReason;
    notes?: string | undefined;
    batchId?: string | undefined;
}>;
export declare const createPaymentSchema: z.ZodObject<{
    shopId: z.ZodString;
    partyType: z.ZodNativeEnum<typeof PartyType>;
    partyId: z.ZodString;
    referenceType: z.ZodNativeEnum<typeof ReferenceType>;
    referenceId: z.ZodString;
    amount: z.ZodNumber;
    method: z.ZodNativeEnum<typeof PaymentMethod>;
    paidAt: z.ZodString;
    referenceNumber: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    shopId: string;
    partyType: PartyType;
    partyId: string;
    referenceType: ReferenceType;
    referenceId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    notes?: string | undefined;
    referenceNumber?: string | undefined;
}, {
    shopId: string;
    partyType: PartyType;
    partyId: string;
    referenceType: ReferenceType;
    referenceId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    notes?: string | undefined;
    referenceNumber?: string | undefined;
}>;
export declare const createCreditNoteSchema: z.ZodObject<{
    shopId: z.ZodString;
    invoiceId: z.ZodString;
    customerId: z.ZodString;
    amount: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    shopId: string;
    customerId: string;
    reason: string;
    amount: number;
    invoiceId: string;
}, {
    shopId: string;
    customerId: string;
    reason: string;
    amount: number;
    invoiceId: string;
}>;
export declare const stockReportFiltersSchema: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
} & {
    categoryId: z.ZodOptional<z.ZodString>;
    productId: z.ZodOptional<z.ZodString>;
    lowStockOnly: z.ZodOptional<z.ZodBoolean>;
    outOfStockOnly: z.ZodOptional<z.ZodBoolean>;
    includeArchived: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    includeArchived: boolean;
    categoryId?: string | undefined;
    productId?: string | undefined;
    lowStockOnly?: boolean | undefined;
    outOfStockOnly?: boolean | undefined;
}, {
    startDate: string;
    endDate: string;
    categoryId?: string | undefined;
    productId?: string | undefined;
    lowStockOnly?: boolean | undefined;
    outOfStockOnly?: boolean | undefined;
    includeArchived?: boolean | undefined;
}>;
export declare const salesReportFiltersSchema: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
} & {
    customerId: z.ZodOptional<z.ZodString>;
    paymentStatus: z.ZodOptional<z.ZodNativeEnum<typeof PaymentStatus>>;
    minAmount: z.ZodOptional<z.ZodNumber>;
    maxAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    customerId?: string | undefined;
    paymentStatus?: PaymentStatus | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
}, {
    startDate: string;
    endDate: string;
    customerId?: string | undefined;
    paymentStatus?: PaymentStatus | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
}>;
export declare const purchaseReportFiltersSchema: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
} & {
    supplierId: z.ZodOptional<z.ZodString>;
    paymentStatus: z.ZodOptional<z.ZodNativeEnum<typeof PaymentStatus>>;
    minAmount: z.ZodOptional<z.ZodNumber>;
    maxAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
    supplierId?: string | undefined;
    paymentStatus?: PaymentStatus | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
}, {
    startDate: string;
    endDate: string;
    supplierId?: string | undefined;
    paymentStatus?: PaymentStatus | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
}>;
export declare const expiryReportFiltersSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    productId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["EXPIRED", "EXPIRING_SOON", "NO_EXPIRY"]>>;
}, "strip", z.ZodTypeAny, {
    categoryId?: string | undefined;
    status?: "EXPIRED" | "EXPIRING_SOON" | "NO_EXPIRY" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    productId?: string | undefined;
}, {
    categoryId?: string | undefined;
    status?: "EXPIRED" | "EXPIRING_SOON" | "NO_EXPIRY" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    productId?: string | undefined;
}>;
export declare const receivablesReportFiltersSchema: z.ZodObject<{
    customerId: z.ZodOptional<z.ZodString>;
    minOutstanding: z.ZodOptional<z.ZodNumber>;
    maxOutstanding: z.ZodOptional<z.ZodNumber>;
    ageingBucket: z.ZodOptional<z.ZodEnum<["NOT_DUE", "1_30", "31_60", "61_90", "90_PLUS"]>>;
}, "strip", z.ZodTypeAny, {
    customerId?: string | undefined;
    minOutstanding?: number | undefined;
    maxOutstanding?: number | undefined;
    ageingBucket?: "NOT_DUE" | "1_30" | "31_60" | "61_90" | "90_PLUS" | undefined;
}, {
    customerId?: string | undefined;
    minOutstanding?: number | undefined;
    maxOutstanding?: number | undefined;
    ageingBucket?: "NOT_DUE" | "1_30" | "31_60" | "61_90" | "90_PLUS" | undefined;
}>;
export declare const exportOptionsSchema: z.ZodObject<{
    format: z.ZodEnum<["csv", "pdf", "excel"]>;
    dateRange: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        startDate: z.ZodString;
        endDate: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        startDate: string;
        endDate: string;
    }, {
        startDate: string;
        endDate: string;
    }>, {
        startDate: string;
        endDate: string;
    }, {
        startDate: string;
        endDate: string;
    }>>;
    fields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    format: "csv" | "pdf" | "excel";
    dateRange?: {
        startDate: string;
        endDate: string;
    } | undefined;
    fields?: string[] | undefined;
    filters?: Record<string, unknown> | undefined;
}, {
    format: "csv" | "pdf" | "excel";
    dateRange?: {
        startDate: string;
        endDate: string;
    } | undefined;
    fields?: string[] | undefined;
    filters?: Record<string, unknown> | undefined;
}>;
export type ExportOptionsInput = z.infer<typeof exportOptionsSchema>;
export declare const idempotencyKeySchema: z.ZodString;
export declare function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    errors: z.ZodError;
};
export declare function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T;
export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type CreateSalesInvoiceInput = z.infer<typeof createSalesInvoiceSchema>;
export type UpdateSalesInvoiceInput = z.infer<typeof updateSalesInvoiceSchema>;
export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
//# sourceMappingURL=index.d.ts.map