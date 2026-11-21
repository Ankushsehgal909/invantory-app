/**
 * Shared Types for ShopStock
 * Used by backend, web-dashboard, and mobile-app
 */
export declare enum UserRole {
    OWNER = "OWNER",
    MANAGER = "MANAGER",
    STAFF = "STAFF",
    VIEWER = "VIEWER"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    PENDING = "PENDING"
}
export declare enum ProductStatus {
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    DELETED = "DELETED"
}
export declare enum ExpiryMode {
    NONE = "NONE",
    PRODUCT_LEVEL = "PRODUCT_LEVEL",
    BATCH_LEVEL = "BATCH_LEVEL"
}
export declare enum UnitOfMeasure {
    PIECE = "PIECE",
    PACK = "PACK",
    BOX = "BOX",
    KG = "KG",
    G = "G",
    LITRE = "LITRE",
    ML = "ML",
    METRE = "METRE",
    CM = "CM"
}
export declare enum MovementType {
    PURCHASE = "PURCHASE",
    PURCHASE_RETURN = "PURCHASE_RETURN",
    SALE = "SALE",
    SALE_RETURN = "SALE_RETURN",
    ADJUSTMENT_IN = "ADJUSTMENT_IN",
    ADJUSTMENT_OUT = "ADJUSTMENT_OUT",
    DAMAGE = "DAMAGE",
    THEFT_LOSS = "THEFT_LOSS",
    EXPIRY_WRITE_OFF = "EXPIRY_WRITE_OFF",
    OPENING_BALANCE = "OPENING_BALANCE",
    INTERNAL_USE = "INTERNAL_USE",
    FOUND_STOCK = "FOUND_STOCK",
    COUNTING_CORRECTION = "COUNTING_CORRECTION",
    TRANSFER_IN = "TRANSFER_IN",
    TRANSFER_OUT = "TRANSFER_OUT"
}
export declare enum AdjustmentReason {
    OPENING_BALANCE_CORRECTION = "OPENING_BALANCE_CORRECTION",
    DAMAGE = "DAMAGE",
    EXPIRY_WRITE_OFF = "EXPIRY_WRITE_OFF",
    THEFT_LOSS = "THEFT_LOSS",
    FOUND_STOCK = "FOUND_STOCK",
    COUNTING_CORRECTION = "COUNTING_CORRECTION",
    INTERNAL_USE = "INTERNAL_USE",
    OTHER = "OTHER"
}
export declare enum PaymentStatus {
    UNPAID = "UNPAID",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    PAID = "PAID",
    OVERDUE = "OVERDUE"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    UPI = "UPI",
    CARD = "CARD",
    BANK_TRANSFER = "BANK_TRANSFER",
    CHEQUE = "CHEQUE",
    CREDIT = "CREDIT",
    OTHER = "OTHER"
}
export declare enum InvoiceStatus {
    DRAFT = "DRAFT",
    FINALIZED = "FINALIZED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum DiscountType {
    FIXED = "FIXED",
    PERCENTAGE = "PERCENTAGE"
}
export declare enum TaxType {
    NONE = "NONE",
    GST = "GST",
    VAT = "VAT",
    CUSTOM = "CUSTOM"
}
export declare enum NotificationType {
    LOW_STOCK = "LOW_STOCK",
    EXPIRY_SOON = "EXPIRY_SOON",
    EXPIRED = "EXPIRED",
    DAILY_SUMMARY = "DAILY_SUMMARY",
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
    PAYMENT_OVERDUE = "PAYMENT_OVERDUE",
    PURCHASE_DUE = "PURCHASE_DUE"
}
export declare enum NotificationStatus {
    PENDING = "PENDING",
    SENT = "SENT",
    READ = "READ",
    DISMISSED = "DISMISSED"
}
export declare enum PartyType {
    CUSTOMER = "CUSTOMER",
    SUPPLIER = "SUPPLIER"
}
export declare enum LedgerEntryType {
    DEBIT = "DEBIT",
    CREDIT = "CREDIT"
}
export declare enum ReferenceType {
    PURCHASE = "PURCHASE",
    SALE = "SALE",
    PAYMENT = "PAYMENT",
    CREDIT_NOTE = "CREDIT_NOTE",
    ADJUSTMENT = "ADJUSTMENT",
    OPENING_BALANCE = "OPENING_BALANCE"
}
export interface Shop {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
    currency: string;
    timezone: string;
    invoicePrefix: string;
    purchasePrefix: string;
    taxSettings: TaxSettings;
    settings: ShopSettings;
    createdAt: Date;
    updatedAt: Date;
}
export interface TaxSettings {
    enabled: boolean;
    taxType: TaxType;
    defaultTaxRate: number;
    taxInclusive: boolean;
    gstin?: string;
}
export interface ShopSettings {
    lowStockDefaultThreshold: number;
    expiryAlertDays: number[];
    allowNegativeStock: boolean;
    defaultPaymentTerms: number;
    enableBatchTracking: boolean;
    enableExpiryTracking: boolean;
    currencySymbol: string;
    dateFormat: string;
    numberFormat: string;
}
export interface User {
    id: string;
    shopId: string;
    name: string;
    phone?: string;
    email?: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    pinHash?: string;
    avatar?: string;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Category {
    id: string;
    shopId: string;
    name: string;
    description?: string;
    parentId?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Product {
    id: string;
    shopId: string;
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    brand?: string;
    description?: string;
    unit: UnitOfMeasure;
    purchaseCost: number;
    sellingPrice: number;
    taxRate?: number;
    reorderLevel: number;
    openingStock: number;
    currentStock: number;
    expiryMode: ExpiryMode;
    status: ProductStatus;
    imageUrl?: string;
    weight?: number;
    conversionFactor?: number;
    baseUnit?: UnitOfMeasure;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
export interface Batch {
    id: string;
    productId: string;
    batchNumber: string;
    purchaseDate: Date;
    expiryDate?: Date;
    quantityReceived: number;
    quantityAvailable: number;
    unitCost: number;
    supplierId?: string;
    purchaseId?: string;
    isExpired: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Supplier {
    id: string;
    shopId: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    notes?: string;
    openingBalance: number;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Customer {
    id: string;
    shopId: string;
    businessName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    billingAddress?: string;
    shippingAddress?: string;
    gstin?: string;
    notes?: string;
    openingBalance: number;
    currentBalance: number;
    creditLimit?: number;
    paymentTerms: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Purchase {
    id: string;
    shopId: string;
    supplierId?: string;
    invoiceNumber: string;
    supplierInvoiceNumber?: string;
    purchaseDate: Date;
    subtotal: number;
    discount: number;
    tax: number;
    additionalCharges: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: PaymentStatus;
    notes?: string;
    attachmentUrls?: string[];
    status: InvoiceStatus;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export interface PurchaseItem {
    id: string;
    purchaseId: string;
    productId: string;
    batchId?: string;
    quantity: number;
    unit: UnitOfMeasure;
    unitCost: number;
    discount: number;
    tax: number;
    lineTotal: number;
    batchNumber?: string;
    expiryDate?: Date;
}
export interface SalesInvoice {
    id: string;
    shopId: string;
    customerId?: string;
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate?: Date;
    subtotal: number;
    discount: number;
    tax: number;
    additionalCharges: number;
    roundingAdjustment: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: PaymentStatus;
    status: InvoiceStatus;
    notes?: string;
    terms?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export interface SalesInvoiceItem {
    id: string;
    invoiceId: string;
    productId: string;
    batchId?: string;
    productNameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unit: UnitOfMeasure;
    unitPrice: number;
    discount: number;
    discountType: DiscountType;
    tax: number;
    lineTotal: number;
    costSnapshot: number;
    batchNumber?: string;
    expiryDate?: Date;
}
export interface StockMovement {
    id: string;
    shopId: string;
    productId: string;
    batchId?: string;
    movementType: MovementType;
    quantityDelta: number;
    quantityBefore: number;
    quantityAfter: number;
    referenceType: ReferenceType;
    referenceId: string;
    reason?: string;
    actorId: string;
    unitCost?: number;
    notes?: string;
    createdAt: Date;
}
export interface Payment {
    id: string;
    shopId: string;
    partyType: PartyType;
    partyId: string;
    referenceType: ReferenceType;
    referenceId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    referenceNumber?: string;
    notes?: string;
    createdAt: Date;
    createdBy: string;
}
export interface CustomerLedgerEntry {
    id: string;
    shopId: string;
    customerId: string;
    entryType: LedgerEntryType;
    referenceType: ReferenceType;
    referenceId: string;
    debit: number;
    credit: number;
    balanceAfter: number;
    description: string;
    createdAt: Date;
}
export interface SupplierLedgerEntry {
    id: string;
    shopId: string;
    supplierId: string;
    entryType: LedgerEntryType;
    referenceType: ReferenceType;
    referenceId: string;
    debit: number;
    credit: number;
    balanceAfter: number;
    description: string;
    createdAt: Date;
}
export interface CreditNote {
    id: string;
    shopId: string;
    invoiceId: string;
    customerId: string;
    amount: number;
    reason: string;
    status: InvoiceStatus;
    createdAt: Date;
    createdBy: string;
}
export interface Notification {
    id: string;
    shopId: string;
    type: NotificationType;
    entityId: string;
    entityType: string;
    title: string;
    message: string;
    dueAt?: Date;
    status: NotificationStatus;
    readAt?: Date;
    createdAt: Date;
}
export interface AuditLog {
    id: string;
    shopId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeJson?: Record<string, unknown>;
    afterJson?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        timestamp: string;
        requestId: string;
    };
}
export interface LoginRequest {
    phone: string;
    password: string;
    shopId?: string;
}
export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    shop: Shop;
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface CreateProductRequest {
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    brand?: string;
    description?: string;
    unit: UnitOfMeasure;
    purchaseCost: number;
    sellingPrice: number;
    taxRate?: number;
    reorderLevel: number;
    openingStock: number;
    expiryMode: ExpiryMode;
    imageUrl?: string;
    weight?: number;
    conversionFactor?: number;
    baseUnit?: UnitOfMeasure;
}
export interface UpdateProductRequest extends Partial<CreateProductRequest> {
    status?: ProductStatus;
}
export interface CreatePurchaseRequest {
    supplierId?: string;
    supplierInvoiceNumber?: string;
    purchaseDate: Date;
    items: CreatePurchaseItemRequest[];
    discount?: number;
    tax?: number;
    additionalCharges?: number;
    amountPaid?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
}
export interface CreatePurchaseItemRequest {
    productId: string;
    quantity: number;
    unit: UnitOfMeasure;
    unitCost: number;
    discount?: number;
    tax?: number;
    batchNumber?: string;
    expiryDate?: Date;
}
export interface CreateSalesInvoiceRequest {
    customerId?: string;
    invoiceDate: Date;
    dueDate?: Date;
    items: CreateSalesInvoiceItemRequest[];
    discount?: number;
    discountType?: DiscountType;
    tax?: number;
    additionalCharges?: number;
    roundingAdjustment?: number;
    amountPaid?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
    terms?: string;
}
export interface CreateSalesInvoiceItemRequest {
    productId: string;
    quantity: number;
    unit: UnitOfMeasure;
    unitPrice: number;
    discount?: number;
    discountType?: DiscountType;
    tax?: number;
    batchId?: string;
}
export interface CreateStockAdjustmentRequest {
    productId: string;
    batchId?: string;
    movementType: MovementType;
    quantityDelta: number;
    reason: AdjustmentReason;
    notes?: string;
}
export interface CreatePaymentRequest {
    partyType: PartyType;
    partyId: string;
    referenceType: ReferenceType;
    referenceId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    referenceNumber?: string;
    notes?: string;
}
export interface CreateCategoryRequest {
    name: string;
    description?: string;
    parentId?: string;
}
export interface CreateSupplierRequest {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    notes?: string;
    openingBalance?: number;
}
export interface CreateCustomerRequest {
    businessName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    billingAddress?: string;
    shippingAddress?: string;
    gstin?: string;
    notes?: string;
    openingBalance?: number;
    creditLimit?: number;
    paymentTerms?: number;
}
export interface StockReportItem {
    productId: string;
    productName: string;
    sku: string;
    category?: string;
    unit: UnitOfMeasure;
    currentStock: number;
    reorderLevel: number;
    purchaseCost: number;
    sellingPrice: number;
    stockValueAtCost: number;
    stockValueAtSale: number;
    batches?: BatchStockInfo[];
    isLowStock: boolean;
    isOutOfStock: boolean;
}
export interface BatchStockInfo {
    batchId: string;
    batchNumber: string;
    quantityAvailable: number;
    expiryDate?: Date;
    unitCost: number;
    isExpired: boolean;
    daysToExpiry?: number;
}
export interface SalesReportItem {
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    customerName?: string;
    itemCount: number;
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: PaymentStatus;
}
export interface PurchaseReportItem {
    purchaseId: string;
    invoiceNumber: string;
    purchaseDate: Date;
    supplierName?: string;
    itemCount: number;
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: PaymentStatus;
}
export interface ExpiryReportItem {
    productId: string;
    productName: string;
    sku: string;
    batchId: string;
    batchNumber: string;
    quantityAvailable: number;
    expiryDate: Date;
    unitCost: number;
    costValue: number;
    daysToExpiry: number;
    status: 'EXPIRED' | 'EXPIRING_SOON' | 'NO_EXPIRY';
}
export interface LowStockReportItem {
    productId: string;
    productName: string;
    sku: string;
    category?: string;
    currentStock: number;
    reorderLevel: number;
    unit: UnitOfMeasure;
    lastPurchaseDate?: Date;
    lastPurchaseCost?: number;
}
export interface ReceivablesReportItem {
    customerId: string;
    customerName: string;
    phone?: string;
    totalOutstanding: number;
    overdueAmount: number;
    notDue: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    oldestInvoiceDate?: Date;
}
export interface PayablesReportItem {
    supplierId: string;
    supplierName: string;
    phone?: string;
    totalOutstanding: number;
    overdueAmount: number;
    notDue: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    oldestPurchaseDate?: Date;
}
export interface DashboardSummary {
    totalProducts: number;
    totalStockUnits: number;
    stockValueAtCost: number;
    stockValueAtSale: number;
    todaySales: number;
    todaySalesCount: number;
    todayPurchases: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    totalReceivables: number;
    totalOverdueReceivables: number;
    totalPayables: number;
    recentTransactions: RecentTransaction[];
}
export interface RecentTransaction {
    id: string;
    type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
    referenceNumber: string;
    date: Date;
    amount: number;
    partyName?: string;
    itemCount: number;
}
export interface CsvImportResult {
    success: number;
    failed: number;
    errors: CsvImportError[];
}
export interface CsvImportError {
    row: number;
    field?: string;
    value?: string;
    message: string;
}
export interface ExportOptions {
    format: 'csv' | 'pdf' | 'excel';
    dateRange?: {
        start: Date;
        end: Date;
    };
    fields?: string[];
    filters?: Record<string, unknown>;
}
export interface ProductFilters {
    search?: string;
    categoryId?: string;
    status?: ProductStatus;
    expiryMode?: ExpiryMode;
    lowStock?: boolean;
    outOfStock?: boolean;
    archived?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface TransactionFilters {
    search?: string;
    type?: MovementType;
    productId?: string;
    batchId?: string;
    startDate?: Date;
    endDate?: Date;
    actorId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface ReportFilters {
    startDate: Date;
    endDate: Date;
    categoryId?: string;
    productId?: string;
    customerId?: string;
    supplierId?: string;
    paymentStatus?: PaymentStatus;
}
//# sourceMappingURL=index.d.ts.map