/**
 * Shared Constants for ShopStock
 */

// ============================================
// Application Constants
// ============================================

export const APP_NAME = 'ShopStock';
export const APP_VERSION = '1.0.0';
export const API_VERSION = 'v1';

// ============================================
// Pagination
// ============================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// ============================================
// Currency
// ============================================

export const DEFAULT_CURRENCY = 'INR';
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_DECIMAL_PLACES = 2;
export const MINOR_UNITS_PER_MAJOR = 100; // paise per rupee

// ============================================
// Date/Time
// ============================================

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';
export const ISO_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";

// ============================================
// Invoice Numbering
// ============================================

export const DEFAULT_INVOICE_PREFIX = 'INV-';
export const DEFAULT_PURCHASE_PREFIX = 'PUR-';
export const DEFAULT_CREDIT_NOTE_PREFIX = 'CN-';
export const INVOICE_NUMBER_PADDING = 6; // e.g., INV-000001

// ============================================
// Stock & Inventory
// ============================================

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const DEFAULT_EXPIRY_ALERT_DAYS = [90, 30, 7, 1];
export const MAX_BATCH_NUMBER_LENGTH = 50;
export const MAX_SKU_LENGTH = 50;
export const MAX_BARCODE_LENGTH = 100;
export const MAX_PRODUCT_NAME_LENGTH = 200;
export const MAX_CATEGORY_NAME_LENGTH = 100;

// ============================================
// Units of Measure
// ============================================

export const UNIT_OF_MEASURE_OPTIONS = [
  { value: 'PIECE', label: 'Piece', symbol: 'pcs' },
  { value: 'PACK', label: 'Pack', symbol: 'pack' },
  { value: 'BOX', label: 'Box', symbol: 'box' },
  { value: 'KG', label: 'Kilogram', symbol: 'kg' },
  { value: 'G', label: 'Gram', symbol: 'g' },
  { value: 'LITRE', label: 'Litre', symbol: 'L' },
  { value: 'ML', label: 'Millilitre', symbol: 'ml' },
  { value: 'METRE', label: 'Metre', symbol: 'm' },
  { value: 'CM', label: 'Centimetre', symbol: 'cm' },
] as const;

export const WEIGHT_BASED_UNITS = ['KG', 'G', 'LITRE', 'ML', 'METRE', 'CM'];
export const COUNT_BASED_UNITS = ['PIECE', 'PACK', 'BOX'];

// ============================================
// Movement Types
// ============================================

export const STOCK_IN_MOVEMENTS = [
  'PURCHASE',
  'PURCHASE_RETURN',
  'SALE_RETURN',
  'ADJUSTMENT_IN',
  'FOUND_STOCK',
  'OPENING_BALANCE',
  'TRANSFER_IN',
] as const;

export const STOCK_OUT_MOVEMENTS = [
  'SALE',
  'PURCHASE_RETURN',
  'SALE_RETURN',
  'ADJUSTMENT_OUT',
  'DAMAGE',
  'THEFT_LOSS',
  'EXPIRY_WRITE_OFF',
  'INTERNAL_USE',
  'COUNTING_CORRECTION',
  'TRANSFER_OUT',
] as const;

// ============================================
// Validation
// ============================================

export const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const SKU_REGEX = /^[A-Z0-9\-_]{1,50}$/;
export const BARCODE_REGEX = /^[0-9]{8,14}$/;

// ============================================
// File Upload
// ============================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/csv'];
export const ALLOWED_ATTACHMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// ============================================
// JWT
// ============================================

export const JWT_ACCESS_TOKEN_EXPIRY = '15m';
export const JWT_REFRESH_TOKEN_EXPIRY = '7d';
export const JWT_ISSUER = 'shopstock';
export const JWT_AUDIENCE = 'shopstock-app';

// ============================================
// Rate Limiting
// ============================================

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;
export const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 20;

// ============================================
// WebSocket Events
// ============================================

export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',

  // Real-time updates
  STOCK_UPDATED: 'stock:updated',
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PURCHASE_CREATED: 'purchase:created',
  PURCHASE_UPDATED: 'purchase:updated',
  SALE_CREATED: 'sale:created',
  SALE_UPDATED: 'sale:updated',
  PAYMENT_RECEIVED: 'payment:received',
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',

  // Sync
  SYNC_REQUEST: 'sync:request',
  SYNC_RESPONSE: 'sync:response',
  SYNC_PROGRESS: 'sync:progress',
  SYNC_COMPLETE: 'sync:complete',
  SYNC_ERROR: 'sync:error',
} as const;

// ============================================
// Notification Defaults
// ============================================

export const NOTIFICATION_DEFAULTS = {
  lowStock: true,
  expirySoon: true,
  expired: true,
  dailySummary: false,
  paymentReceived: true,
  paymentOverdue: true,
  purchaseDue: false,
} as const;

// ============================================
// Export Formats
// ============================================

export const EXPORT_FORMATS = ['csv', 'pdf', 'excel'] as const;
export const REPORT_TYPES = [
  'stock',
  'sales',
  'purchases',
  'expiry',
  'lowStock',
  'receivables',
  'payables',
  'stockMovement',
  'customerLedger',
  'supplierLedger',
] as const;

// ============================================
// User Roles Permissions
// ============================================

export const ROLE_PERMISSIONS = {
  OWNER: [
    'manage_shop',
    'manage_users',
    'manage_products',
    'manage_categories',
    'manage_suppliers',
    'manage_customers',
    'create_purchase',
    'edit_purchase',
    'delete_purchase',
    'create_sale',
    'edit_sale',
    'delete_sale',
    'create_adjustment',
    'manage_stock',
    'view_reports',
    'export_data',
    'manage_settings',
    'backup_restore',
    'view_audit_log',
    'manage_notifications',
  ],
  MANAGER: [
    'manage_products',
    'manage_categories',
    'manage_suppliers',
    'manage_customers',
    'create_purchase',
    'edit_purchase',
    'create_sale',
    'edit_sale',
    'create_adjustment',
    'manage_stock',
    'view_reports',
    'export_data',
    'manage_notifications',
  ],
  STAFF: [
    'view_products',
    'create_sale',
    'view_own_sales',
    'create_adjustment',
    'view_stock',
    'view_notifications',
  ],
  VIEWER: [
    'view_products',
    'view_reports',
    'export_data',
  ],
} as const;

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business Logic
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  NEGATIVE_STOCK_NOT_ALLOWED: 'NEGATIVE_STOCK_NOT_ALLOWED',
  INVALID_BATCH: 'INVALID_BATCH',
  EXPIRED_BATCH: 'EXPIRED_BATCH',
  CANNOT_DELETE_WITH_HISTORY: 'CANNOT_DELETE_WITH_HISTORY',
  INVOICE_ALREADY_FINALIZED: 'INVOICE_ALREADY_FINALIZED',
  PAYMENT_EXCEEDS_BALANCE: 'PAYMENT_EXCEEDS_BALANCE',
  DUPLICATE_INVOICE_NUMBER: 'DUPLICATE_INVOICE_NUMBER',
  DUPLICATE_SKU: 'DUPLICATE_SKU',
  DUPLICATE_BARCODE: 'DUPLICATE_BARCODE',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  IDEMPOTENCY_KEY_EXISTS: 'IDEMPOTENCY_KEY_EXISTS',
} as const;

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;