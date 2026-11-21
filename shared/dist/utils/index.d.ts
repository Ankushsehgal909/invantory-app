/**
 * Shared Utilities for ShopStock
 */
/**
 * Convert major currency units to minor units (e.g., rupees to paise)
 * @param major - Amount in major units (e.g., 100.50)
 * @returns Amount in minor units (e.g., 10050)
 */
export declare function toMinorUnits(major: number): number;
/**
 * Convert minor currency units to major units (e.g., paise to rupees)
 * @param minor - Amount in minor units (e.g., 10050)
 * @returns Amount in major units (e.g., 100.50)
 */
export declare function toMajorUnits(minor: number): number;
/**
 * Format currency for display
 * @param minor - Amount in minor units
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export declare function formatCurrency(minor: number, options?: {
    currency?: string;
    locale?: string;
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}): string;
/**
 * Format currency from major units (e.g., rupees) for display
 * @param major - Amount in major units (e.g., 100.50)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export declare function formatCurrencyMajor(major: number, options?: {
    currency?: string;
    locale?: string;
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}): string;
/**
 * Parse currency string to minor units
 * @param value - Currency string (e.g., "₹100.50" or "100.50")
 * @returns Amount in minor units
 */
export declare function parseCurrency(value: string): number;
/**
 * Safely add two minor unit amounts
 */
export declare function addMinorUnits(a: number, b: number): number;
/**
 * Safely subtract two minor unit amounts
 */
export declare function subtractMinorUnits(a: number, b: number): number;
/**
 * Calculate percentage of a minor unit amount
 */
export declare function calculatePercentage(minor: number, percentage: number): number;
/**
 * Calculate discount amount
 */
export declare function calculateDiscount(amount: number, discount: number, discountType: 'FIXED' | 'PERCENTAGE'): number;
/**
 * Format date for display
 */
export declare function formatDate(date: Date | string, options?: {
    format?: 'short' | 'long' | 'datetime';
    locale?: string;
    timezone?: string;
}): string;
/**
 * Get start of day in UTC
 */
export declare function startOfDay(date?: Date): Date;
/**
 * Get end of day in UTC
 */
export declare function endOfDay(date?: Date): Date;
/**
 * Add days to a date
 */
export declare function addDays(date: Date, days: number): Date;
/**
 * Get difference in days between two dates
 */
export declare function daysBetween(from: Date, to?: Date): number;
/**
 * Check if date is in the past
 */
export declare function isPast(date: Date): boolean;
/**
 * Check if date is today
 */
export declare function isToday(date: Date): boolean;
/**
 * Round to specified decimal places
 */
export declare function round(value: number, decimals?: number): number;
/**
 * Format number with locale
 */
export declare function formatNumber(value: number, options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
}): string;
/**
 * Clamp number between min and max
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Generate slug from string
 */
export declare function slugify(text: string): string;
/**
 * Truncate string with ellipsis
 */
export declare function truncate(text: string, maxLength: number): string;
/**
 * Capitalize first letter of each word
 */
export declare function titleCase(text: string): string;
/**
 * Generate random string
 */
export declare function randomString(length?: number): string;
/**
 * Mask sensitive string (e.g., phone, card number)
 */
export declare function maskString(text: string, visibleStart?: number, visibleEnd?: number, maskChar?: string): string;
/**
 * Generate invoice number
 */
export declare function generateInvoiceNumber(prefix: string, sequence: number, padding?: number): string;
/**
 * Generate unique ID (simple UUID v4)
 */
export declare function generateId(): string;
/**
 * Generate short ID (nanoid-style)
 */
export declare function generateShortId(length?: number): string;
/**
 * Group array by key
 */
export declare function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]>;
/**
 * Sort array by key
 */
export declare function sortBy<T>(array: T[], key: keyof T | ((item: T) => string | number), order?: 'asc' | 'desc'): T[];
/**
 * Remove duplicates from array by key
 */
export declare function uniqueBy<T>(array: T[], key: keyof T | ((item: T) => string)): T[];
/**
 * Deep clone object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Omit keys from object
 */
export declare function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
/**
 * Pick keys from object
 */
export declare function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export declare function isEmpty(value: unknown): boolean;
/**
 * Check if string is valid UUID
 */
export declare function isValidUuid(uuid: string): boolean;
/**
 * Check if string is valid email
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Check if string is valid phone (Indian format)
 */
export declare function isValidPhone(phone: string): boolean;
/**
 * Check if string is valid GSTIN
 */
export declare function isValidGstin(gstin: string): boolean;
/**
 * Format file size
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Get file extension
 */
export declare function getFileExtension(filename: string): string;
/**
 * Check if file type is allowed
 */
export declare function isAllowedFileType(mimeType: string, allowedTypes: string[]): boolean;
/**
 * Sleep for specified milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
}): Promise<T>;
/**
 * Run promises in parallel with concurrency limit
 */
export declare function parallelLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]>;
/**
 * Get environment variable with default
 */
export declare function getEnv(key: string, defaultValue?: string): string;
/**
 * Check if running in development
 */
export declare function isDevelopment(): boolean;
/**
 * Check if running in production
 */
export declare function isProduction(): boolean;
/**
 * Check if running in test
 */
export declare function isTest(): boolean;
//# sourceMappingURL=index.d.ts.map