/**
 * Shared Types for ShopStock
 * Used by backend, web-dashboard, and mobile-app
 */
// ============================================
// Enums
// ============================================
export var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["STAFF"] = "STAFF";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (UserRole = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["PENDING"] = "PENDING";
})(UserStatus || (UserStatus = {}));
export var ProductStatus;
(function (ProductStatus) {
    ProductStatus["ACTIVE"] = "ACTIVE";
    ProductStatus["ARCHIVED"] = "ARCHIVED";
    ProductStatus["DELETED"] = "DELETED";
})(ProductStatus || (ProductStatus = {}));
export var ExpiryMode;
(function (ExpiryMode) {
    ExpiryMode["NONE"] = "NONE";
    ExpiryMode["PRODUCT_LEVEL"] = "PRODUCT_LEVEL";
    ExpiryMode["BATCH_LEVEL"] = "BATCH_LEVEL";
})(ExpiryMode || (ExpiryMode = {}));
export var UnitOfMeasure;
(function (UnitOfMeasure) {
    UnitOfMeasure["PIECE"] = "PIECE";
    UnitOfMeasure["PACK"] = "PACK";
    UnitOfMeasure["BOX"] = "BOX";
    UnitOfMeasure["KG"] = "KG";
    UnitOfMeasure["G"] = "G";
    UnitOfMeasure["LITRE"] = "LITRE";
    UnitOfMeasure["ML"] = "ML";
    UnitOfMeasure["METRE"] = "METRE";
    UnitOfMeasure["CM"] = "CM";
})(UnitOfMeasure || (UnitOfMeasure = {}));
export var MovementType;
(function (MovementType) {
    MovementType["PURCHASE"] = "PURCHASE";
    MovementType["PURCHASE_RETURN"] = "PURCHASE_RETURN";
    MovementType["SALE"] = "SALE";
    MovementType["SALE_RETURN"] = "SALE_RETURN";
    MovementType["ADJUSTMENT_IN"] = "ADJUSTMENT_IN";
    MovementType["ADJUSTMENT_OUT"] = "ADJUSTMENT_OUT";
    MovementType["DAMAGE"] = "DAMAGE";
    MovementType["THEFT_LOSS"] = "THEFT_LOSS";
    MovementType["EXPIRY_WRITE_OFF"] = "EXPIRY_WRITE_OFF";
    MovementType["OPENING_BALANCE"] = "OPENING_BALANCE";
    MovementType["INTERNAL_USE"] = "INTERNAL_USE";
    MovementType["FOUND_STOCK"] = "FOUND_STOCK";
    MovementType["COUNTING_CORRECTION"] = "COUNTING_CORRECTION";
    MovementType["TRANSFER_IN"] = "TRANSFER_IN";
    MovementType["TRANSFER_OUT"] = "TRANSFER_OUT";
})(MovementType || (MovementType = {}));
export var AdjustmentReason;
(function (AdjustmentReason) {
    AdjustmentReason["OPENING_BALANCE_CORRECTION"] = "OPENING_BALANCE_CORRECTION";
    AdjustmentReason["DAMAGE"] = "DAMAGE";
    AdjustmentReason["EXPIRY_WRITE_OFF"] = "EXPIRY_WRITE_OFF";
    AdjustmentReason["THEFT_LOSS"] = "THEFT_LOSS";
    AdjustmentReason["FOUND_STOCK"] = "FOUND_STOCK";
    AdjustmentReason["COUNTING_CORRECTION"] = "COUNTING_CORRECTION";
    AdjustmentReason["INTERNAL_USE"] = "INTERNAL_USE";
    AdjustmentReason["OTHER"] = "OTHER";
})(AdjustmentReason || (AdjustmentReason = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["UNPAID"] = "UNPAID";
    PaymentStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["OVERDUE"] = "OVERDUE";
})(PaymentStatus || (PaymentStatus = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["CHEQUE"] = "CHEQUE";
    PaymentMethod["CREDIT"] = "CREDIT";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (PaymentMethod = {}));
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["PENDING"] = "PENDING";
    InvoiceStatus["COMPLETED"] = "COMPLETED";
    InvoiceStatus["FINALIZED"] = "FINALIZED";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
    InvoiceStatus["REFUNDED"] = "REFUNDED";
})(InvoiceStatus || (InvoiceStatus = {}));
export var DiscountType;
(function (DiscountType) {
    DiscountType["FIXED"] = "FIXED";
    DiscountType["PERCENTAGE"] = "PERCENTAGE";
})(DiscountType || (DiscountType = {}));
export var TaxType;
(function (TaxType) {
    TaxType["NONE"] = "NONE";
    TaxType["GST"] = "GST";
    TaxType["VAT"] = "VAT";
    TaxType["CUSTOM"] = "CUSTOM";
})(TaxType || (TaxType = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["LOW_STOCK"] = "LOW_STOCK";
    NotificationType["EXPIRY_SOON"] = "EXPIRY_SOON";
    NotificationType["EXPIRED"] = "EXPIRED";
    NotificationType["DAILY_SUMMARY"] = "DAILY_SUMMARY";
    NotificationType["PAYMENT_RECEIVED"] = "PAYMENT_RECEIVED";
    NotificationType["PAYMENT_OVERDUE"] = "PAYMENT_OVERDUE";
    NotificationType["PURCHASE_DUE"] = "PURCHASE_DUE";
})(NotificationType || (NotificationType = {}));
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "PENDING";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["READ"] = "READ";
    NotificationStatus["DISMISSED"] = "DISMISSED";
})(NotificationStatus || (NotificationStatus = {}));
export var PartyType;
(function (PartyType) {
    PartyType["CUSTOMER"] = "CUSTOMER";
    PartyType["SUPPLIER"] = "SUPPLIER";
})(PartyType || (PartyType = {}));
export var LedgerEntryType;
(function (LedgerEntryType) {
    LedgerEntryType["DEBIT"] = "DEBIT";
    LedgerEntryType["CREDIT"] = "CREDIT";
})(LedgerEntryType || (LedgerEntryType = {}));
export var ReferenceType;
(function (ReferenceType) {
    ReferenceType["PURCHASE"] = "PURCHASE";
    ReferenceType["SALE"] = "SALE";
    ReferenceType["PAYMENT"] = "PAYMENT";
    ReferenceType["CREDIT_NOTE"] = "CREDIT_NOTE";
    ReferenceType["ADJUSTMENT"] = "ADJUSTMENT";
    ReferenceType["OPENING_BALANCE"] = "OPENING_BALANCE";
})(ReferenceType || (ReferenceType = {}));
//# sourceMappingURL=index.js.map