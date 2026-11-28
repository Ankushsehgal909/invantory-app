/**
 * Shared Types for ShopStock
 * Used by backend, web-dashboard, and mobile-app
 */

// ============================================
// Enums
// ============================================

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum ExpiryMode {
  NONE = 'NONE',
  PRODUCT_LEVEL = 'PRODUCT_LEVEL',
  BATCH_LEVEL = 'BATCH_LEVEL',
}

export enum UnitOfMeasure {
  PIECE = 'PIECE',
  PACK = 'PACK',
  BOX = 'BOX',
  KG = 'KG',
  G = 'G',
  LITRE = 'LITRE',
  ML = 'ML',
  METRE = 'METRE',
  CM = 'CM',
}

export enum MovementType {
  PURCHASE = 'PURCHASE',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  DAMAGE = 'DAMAGE',
  THEFT_LOSS = 'THEFT_LOSS',
  EXPIRY_WRITE_OFF = 'EXPIRY_WRITE_OFF',
  OPENING_BALANCE = 'OPENING_BALANCE',
  INTERNAL_USE = 'INTERNAL_USE',
  FOUND_STOCK = 'FOUND_STOCK',
  COUNTING_CORRECTION = 'COUNTING_CORRECTION',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

export enum AdjustmentReason {
  OPENING_BALANCE_CORRECTION = 'OPENING_BALANCE_CORRECTION',
  DAMAGE = 'DAMAGE',
  EXPIRY_WRITE_OFF = 'EXPIRY_WRITE_OFF',
  THEFT_LOSS = 'THEFT_LOSS',
  FOUND_STOCK = 'FOUND_STOCK',
  COUNTING_CORRECTION = 'COUNTING_CORRECTION',
  INTERNAL_USE = 'INTERNAL_USE',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CREDIT = 'CREDIT',
  OTHER = 'OTHER',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FINALIZED = 'FINALIZED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum DiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export enum TaxType {
  NONE = 'NONE',
  GST = 'GST',
  VAT = 'VAT',
  CUSTOM = 'CUSTOM',
}

export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRY_SOON = 'EXPIRY_SOON',
  EXPIRED = 'EXPIRED',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PURCHASE_DUE = 'PURCHASE_DUE',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  DISMISSED = 'DISMISSED',
}

export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum ReferenceType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
  CREDIT_NOTE = 'CREDIT_NOTE',
  ADJUSTMENT = 'ADJUSTMENT',
  OPENING_BALANCE = 'OPENING_BALANCE',
}

// ============================================
// Core Entities
// ============================================

export interface Shop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  currency: string; // ISO 4217, default 'INR'
  timezone: string; // IANA timezone, default 'Asia/Kolkata'
  invoicePrefix: string; // e.g., 'INV-'
  purchasePrefix: string; // e.g., 'PUR-'
  taxSettings: TaxSettings;
  settings: ShopSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxSettings {
  enabled: boolean;
  taxType: TaxType;
  defaultTaxRate: number; // percentage, e.g., 18 for 18%
  taxInclusive: boolean; // whether prices include tax
  gstin?: string; // GSTIN for India
}

export interface ShopSettings {
  lowStockDefaultThreshold: number;
  expiryAlertDays: number[]; // e.g., [90, 30, 7, 1]
  allowNegativeStock: boolean;
  defaultPaymentTerms: number; // days
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
  pinHash?: string; // for quick re-auth
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
  purchaseCost: number; // minor units (paise)
  sellingPrice: number; // minor units (paise)
  taxRate?: number; // percentage
  reorderLevel: number;
  openingStock: number;
  currentStock: number; // computed, not stored directly
  expiryMode: ExpiryMode;
  status: ProductStatus;
  imageUrl?: string;
  weight?: number; // for unit conversion
  conversionFactor?: number; // e.g., 1 box = 12 pieces
  baseUnit?: UnitOfMeasure; // base unit for conversion
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  // Extended fields for API responses
  category?: Category;
  batches?: Batch[];
  _count?: { batches: number };
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  purchaseDate: Date;
  expiryDate?: Date;
  quantityReceived: number;
  quantityAvailable: number;
  unitCost: number; // minor units
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
  openingBalance: number; // minor units
  currentBalance: number; // computed
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Extended fields for API responses
  outstandingBalance?: number; // alias for currentBalance
  totalPurchases?: number;
  purchases?: Purchase[];
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
  openingBalance: number; // minor units
  currentBalance: number; // computed
  creditLimit?: number; // minor units
  paymentTerms: number; // days
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Extended fields for API responses
  outstandingBalance?: number; // alias for currentBalance
  totalPurchases?: number;
  salesInvoices?: SalesInvoice[];
}

export interface Purchase {
  id: string;
  shopId: string;
  supplierId?: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  purchaseDate: Date;
  subtotal: number; // minor units
  discount: number; // minor units
  tax: number; // minor units
  additionalCharges: number; // minor units
  grandTotal: number; // minor units
  amountPaid: number; // minor units
  balanceDue: number; // minor units
  paymentStatus: PaymentStatus;
  notes?: string;
  attachmentUrls?: string[];
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Extended fields for API responses
  supplier?: Supplier;
  items?: PurchaseItem[];
  _count?: { items: number };
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  batchId?: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitCost: number; // minor units
  discount: number; // minor units
  tax: number; // minor units
  lineTotal: number; // minor units
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
  subtotal: number; // minor units
  discount: number; // minor units
  tax: number; // minor units
  additionalCharges: number; // minor units
  roundingAdjustment: number; // minor units
  grandTotal: number; // minor units
  amountPaid: number; // minor units
  balanceDue: number; // minor units
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Extended fields for API responses
  customer?: Customer;
  items?: SalesInvoiceItem[];
  payments?: Payment[];
  _count?: { items: number };
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
  unitPrice: number; // minor units
  discount: number; // minor units
  discountType: DiscountType;
  tax: number; // minor units
  lineTotal: number; // minor units
  costSnapshot: number; // minor units - for margin calculation
  batchNumber?: string;
  expiryDate?: Date;
}

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  batchId?: string;
  movementType: MovementType;
  quantityDelta: number; // positive for in, negative for out
  quantityBefore: number;
  quantityAfter: number;
  referenceType: ReferenceType;
  referenceId: string;
  reason?: string;
  actorId: string;
  unitCost?: number; // for valuation
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
  amount: number; // minor units
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
  debit: number; // minor units
  credit: number; // minor units
  balanceAfter: number; // minor units
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
  debit: number; // minor units
  credit: number; // minor units
  balanceAfter: number; // minor units
  description: string;
  createdAt: Date;
}

// Generic ledger entry for combined reports
export interface LedgerEntry {
  id: string;
  date: Date;
  type: LedgerEntryType; // DEBIT or CREDIT
  referenceType: ReferenceType;
  referenceId: string;
  referenceNumber?: string;
  invoiceNumber?: string;
  amount: number; // minor units
  runningBalance: number; // minor units
  description: string;
  partyType: PartyType; // CUSTOMER or SUPPLIER
  partyId: string;
  partyName: string;
}

export interface CreditNote {
  id: string;
  shopId: string;
  invoiceId: string;
  customerId: string;
  amount: number; // minor units
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

// ============================================
// API Request/Response Types
// ============================================

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
  batchId?: string; // for FEFO/manual selection
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

// ============================================
// Report Types
// ============================================

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

// ============================================
// Import/Export Types
// ============================================

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
  dateRange?: { start: Date; end: Date };
  fields?: string[];
  filters?: Record<string, unknown>;
}

// ============================================
// Search/Filter Types
// ============================================

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