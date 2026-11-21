/**
 * Shared Constants for ShopStock
 */
export { UserRole, UserStatus, ProductStatus, ExpiryMode, UnitOfMeasure, MovementType, AdjustmentReason, PaymentStatus, PaymentMethod, InvoiceStatus, DiscountType, TaxType, NotificationType, NotificationStatus, PartyType, LedgerEntryType, ReferenceType, } from '../types';
export declare const APP_NAME = "ShopStock";
export declare const APP_VERSION = "1.0.0";
export declare const API_VERSION = "v1";
export declare const DEFAULT_PAGE = 1;
export declare const DEFAULT_LIMIT = 20;
export declare const MAX_LIMIT = 100;
export declare const DEFAULT_CURRENCY = "INR";
export declare const CURRENCY_SYMBOL = "\u20B9";
export declare const CURRENCY_DECIMAL_PLACES = 2;
export declare const MINOR_UNITS_PER_MAJOR = 100;
export declare const DEFAULT_TIMEZONE = "Asia/Kolkata";
export declare const DATE_FORMAT = "dd/MM/yyyy";
export declare const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";
export declare const ISO_DATE_FORMAT = "yyyy-MM-dd";
export declare const ISO_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";
export declare const DEFAULT_INVOICE_PREFIX = "INV-";
export declare const DEFAULT_PURCHASE_PREFIX = "PUR-";
export declare const DEFAULT_CREDIT_NOTE_PREFIX = "CN-";
export declare const INVOICE_NUMBER_PADDING = 6;
export declare const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export declare const DEFAULT_EXPIRY_ALERT_DAYS: number[];
export declare const MAX_BATCH_NUMBER_LENGTH = 50;
export declare const MAX_SKU_LENGTH = 50;
export declare const MAX_BARCODE_LENGTH = 100;
export declare const MAX_PRODUCT_NAME_LENGTH = 200;
export declare const MAX_CATEGORY_NAME_LENGTH = 100;
export declare const UNIT_OF_MEASURE_OPTIONS: readonly [{
    readonly value: "PIECE";
    readonly label: "Piece";
    readonly symbol: "pcs";
}, {
    readonly value: "PACK";
    readonly label: "Pack";
    readonly symbol: "pack";
}, {
    readonly value: "BOX";
    readonly label: "Box";
    readonly symbol: "box";
}, {
    readonly value: "KG";
    readonly label: "Kilogram";
    readonly symbol: "kg";
}, {
    readonly value: "G";
    readonly label: "Gram";
    readonly symbol: "g";
}, {
    readonly value: "LITRE";
    readonly label: "Litre";
    readonly symbol: "L";
}, {
    readonly value: "ML";
    readonly label: "Millilitre";
    readonly symbol: "ml";
}, {
    readonly value: "METRE";
    readonly label: "Metre";
    readonly symbol: "m";
}, {
    readonly value: "CM";
    readonly label: "Centimetre";
    readonly symbol: "cm";
}];
export declare const WEIGHT_BASED_UNITS: string[];
export declare const COUNT_BASED_UNITS: string[];
export declare const STOCK_IN_MOVEMENTS: readonly ["PURCHASE", "PURCHASE_RETURN", "SALE_RETURN", "ADJUSTMENT_IN", "FOUND_STOCK", "OPENING_BALANCE", "TRANSFER_IN"];
export declare const STOCK_OUT_MOVEMENTS: readonly ["SALE", "PURCHASE_RETURN", "SALE_RETURN", "ADJUSTMENT_OUT", "DAMAGE", "THEFT_LOSS", "EXPIRY_WRITE_OFF", "INTERNAL_USE", "COUNTING_CORRECTION", "TRANSFER_OUT"];
export declare const PHONE_REGEX: RegExp;
export declare const EMAIL_REGEX: RegExp;
export declare const GSTIN_REGEX: RegExp;
export declare const SKU_REGEX: RegExp;
export declare const BARCODE_REGEX: RegExp;
export declare const MAX_FILE_SIZE: number;
export declare const ALLOWED_IMAGE_TYPES: string[];
export declare const ALLOWED_DOCUMENT_TYPES: string[];
export declare const ALLOWED_ATTACHMENT_TYPES: string[];
export declare const JWT_ACCESS_TOKEN_EXPIRY = "15m";
export declare const JWT_REFRESH_TOKEN_EXPIRY = "7d";
export declare const JWT_ISSUER = "shopstock";
export declare const JWT_AUDIENCE = "shopstock-app";
export declare const RATE_LIMIT_WINDOW_MS: number;
export declare const RATE_LIMIT_MAX_REQUESTS = 100;
export declare const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;
export declare const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 20;
export declare const WS_EVENTS: {
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly AUTHENTICATE: "authenticate";
    readonly AUTHENTICATED: "authenticated";
    readonly STOCK_UPDATED: "stock:updated";
    readonly PRODUCT_CREATED: "product:created";
    readonly PRODUCT_UPDATED: "product:updated";
    readonly PRODUCT_DELETED: "product:deleted";
    readonly PURCHASE_CREATED: "purchase:created";
    readonly PURCHASE_UPDATED: "purchase:updated";
    readonly SALE_CREATED: "sale:created";
    readonly SALE_UPDATED: "sale:updated";
    readonly PAYMENT_RECEIVED: "payment:received";
    readonly NOTIFICATION_CREATED: "notification:created";
    readonly NOTIFICATION_READ: "notification:read";
    readonly SYNC_REQUEST: "sync:request";
    readonly SYNC_RESPONSE: "sync:response";
    readonly SYNC_PROGRESS: "sync:progress";
    readonly SYNC_COMPLETE: "sync:complete";
    readonly SYNC_ERROR: "sync:error";
};
export declare const NOTIFICATION_DEFAULTS: {
    readonly lowStock: true;
    readonly expirySoon: true;
    readonly expired: true;
    readonly dailySummary: false;
    readonly paymentReceived: true;
    readonly paymentOverdue: true;
    readonly purchaseDue: false;
};
export declare const EXPORT_FORMATS: readonly ["csv", "pdf", "excel"];
export declare const REPORT_TYPES: readonly ["stock", "sales", "purchases", "expiry", "lowStock", "receivables", "payables", "stockMovement", "customerLedger", "supplierLedger"];
export declare const ROLE_PERMISSIONS: {
    readonly OWNER: readonly ["manage_shop", "manage_users", "manage_products", "manage_categories", "manage_suppliers", "manage_customers", "create_purchase", "edit_purchase", "delete_purchase", "create_sale", "edit_sale", "delete_sale", "create_adjustment", "manage_stock", "view_reports", "export_data", "manage_settings", "backup_restore", "view_audit_log", "manage_notifications"];
    readonly MANAGER: readonly ["manage_products", "manage_categories", "manage_suppliers", "manage_customers", "create_purchase", "edit_purchase", "create_sale", "edit_sale", "create_adjustment", "manage_stock", "view_reports", "export_data", "manage_notifications"];
    readonly STAFF: readonly ["view_products", "create_sale", "view_own_sales", "create_adjustment", "view_stock", "view_notifications"];
    readonly VIEWER: readonly ["view_products", "view_reports", "export_data"];
};
export declare const ERROR_CODES: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly REFRESH_TOKEN_EXPIRED: "REFRESH_TOKEN_EXPIRED";
    readonly REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly DUPLICATE_ENTRY: "DUPLICATE_ENTRY";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly CONFLICT: "CONFLICT";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly NEGATIVE_STOCK_NOT_ALLOWED: "NEGATIVE_STOCK_NOT_ALLOWED";
    readonly INVALID_BATCH: "INVALID_BATCH";
    readonly EXPIRED_BATCH: "EXPIRED_BATCH";
    readonly CANNOT_DELETE_WITH_HISTORY: "CANNOT_DELETE_WITH_HISTORY";
    readonly INVOICE_ALREADY_FINALIZED: "INVOICE_ALREADY_FINALIZED";
    readonly PAYMENT_EXCEEDS_BALANCE: "PAYMENT_EXCEEDS_BALANCE";
    readonly DUPLICATE_INVOICE_NUMBER: "DUPLICATE_INVOICE_NUMBER";
    readonly DUPLICATE_SKU: "DUPLICATE_SKU";
    readonly DUPLICATE_BARCODE: "DUPLICATE_BARCODE";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    readonly INVALID_FILE_TYPE: "INVALID_FILE_TYPE";
    readonly SYNC_CONFLICT: "SYNC_CONFLICT";
    readonly IDEMPOTENCY_KEY_EXISTS: "IDEMPOTENCY_KEY_EXISTS";
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
//# sourceMappingURL=index.d.ts.map