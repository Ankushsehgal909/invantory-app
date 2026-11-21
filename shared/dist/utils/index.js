/**
 * Shared Utilities for ShopStock
 */
// ============================================
// Currency Utilities
// ============================================
/**
 * Convert major currency units to minor units (e.g., rupees to paise)
 * @param major - Amount in major units (e.g., 100.50)
 * @returns Amount in minor units (e.g., 10050)
 */
export function toMinorUnits(major) {
    return Math.round(major * 100);
}
/**
 * Convert minor currency units to major units (e.g., paise to rupees)
 * @param minor - Amount in minor units (e.g., 10050)
 * @returns Amount in major units (e.g., 100.50)
 */
export function toMajorUnits(minor) {
    return minor / 100;
}
/**
 * Format currency for display
 * @param minor - Amount in minor units
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(minor, options = {}) {
    const { currency = 'INR', locale = 'en-IN', showSymbol = true, minimumFractionDigits = 2, maximumFractionDigits = 2, } = options;
    const major = toMajorUnits(minor);
    return new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: showSymbol ? currency : undefined,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(major);
}
/**
 * Format currency from major units (e.g., rupees) for display
 * @param major - Amount in major units (e.g., 100.50)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrencyMajor(major, options = {}) {
    const { currency = 'INR', locale = 'en-IN', showSymbol = true, minimumFractionDigits = 2, maximumFractionDigits = 2, } = options;
    return new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: showSymbol ? currency : undefined,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(major);
}
/**
 * Parse currency string to minor units
 * @param value - Currency string (e.g., "₹100.50" or "100.50")
 * @returns Amount in minor units
 */
export function parseCurrency(value) {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[₹$,\s]/g, '');
    const major = parseFloat(cleaned);
    if (isNaN(major)) {
        throw new Error(`Invalid currency value: ${value}`);
    }
    return toMinorUnits(major);
}
/**
 * Safely add two minor unit amounts
 */
export function addMinorUnits(a, b) {
    return a + b;
}
/**
 * Safely subtract two minor unit amounts
 */
export function subtractMinorUnits(a, b) {
    return a - b;
}
/**
 * Calculate percentage of a minor unit amount
 */
export function calculatePercentage(minor, percentage) {
    return Math.round(minor * (percentage / 100));
}
/**
 * Calculate discount amount
 */
export function calculateDiscount(amount, discount, discountType) {
    if (discountType === 'FIXED') {
        return discount;
    }
    return calculatePercentage(amount, discount);
}
// ============================================
// Date/Time Utilities
// ============================================
/**
 * Format date for display
 */
export function formatDate(date, options = {}) {
    const { format = 'short', locale = 'en-IN', timezone = 'Asia/Kolkata' } = options;
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        return 'Invalid Date';
    }
    const formatOptions = {
        timeZone: timezone,
    };
    switch (format) {
        case 'short':
            formatOptions.day = '2-digit';
            formatOptions.month = '2-digit';
            formatOptions.year = 'numeric';
            break;
        case 'long':
            formatOptions.day = '2-digit';
            formatOptions.month = 'long';
            formatOptions.year = 'numeric';
            break;
        case 'datetime':
            formatOptions.day = '2-digit';
            formatOptions.month = '2-digit';
            formatOptions.year = 'numeric';
            formatOptions.hour = '2-digit';
            formatOptions.minute = '2-digit';
            formatOptions.hour12 = true;
            break;
    }
    return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}
/**
 * Get start of day in UTC
 */
export function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
/**
 * Get end of day in UTC
 */
export function endOfDay(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
}
/**
 * Add days to a date
 */
export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
/**
 * Get difference in days between two dates
 */
export function daysBetween(from, to = new Date()) {
    const diffTime = to.getTime() - from.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
/**
 * Check if date is in the past
 */
export function isPast(date) {
    return date < new Date();
}
/**
 * Check if date is today
 */
export function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}
// ============================================
// Number Utilities
// ============================================
/**
 * Round to specified decimal places
 */
export function round(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
/**
 * Format number with locale
 */
export function formatNumber(value, options = {}) {
    const { locale = 'en-IN', minimumFractionDigits = 0, maximumFractionDigits = 2, notation = 'standard' } = options;
    return new Intl.NumberFormat(locale, {
        notation,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(value);
}
/**
 * Clamp number between min and max
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
// ============================================
// String Utilities
// ============================================
/**
 * Generate slug from string
 */
export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
/**
 * Truncate string with ellipsis
 */
export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - 3) + '...';
}
/**
 * Capitalize first letter of each word
 */
export function titleCase(text) {
    return text.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
/**
 * Generate random string
 */
export function randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * Mask sensitive string (e.g., phone, card number)
 */
export function maskString(text, visibleStart = 2, visibleEnd = 2, maskChar = '*') {
    if (text.length <= visibleStart + visibleEnd) {
        return maskChar.repeat(text.length);
    }
    const start = text.slice(0, visibleStart);
    const end = text.slice(-visibleEnd);
    const middle = maskChar.repeat(text.length - visibleStart - visibleEnd);
    return start + middle + end;
}
// ============================================
// ID Generation
// ============================================
/**
 * Generate invoice number
 */
export function generateInvoiceNumber(prefix, sequence, padding = 6) {
    return `${prefix}${sequence.toString().padStart(padding, '0')}`;
}
/**
 * Generate unique ID (simple UUID v4)
 */
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/**
 * Generate short ID (nanoid-style)
 */
export function generateShortId(length = 12) {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let id = '';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
        id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
}
// ============================================
// Array/Object Utilities
// ============================================
/**
 * Group array by key
 */
export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {});
}
/**
 * Sort array by key
 */
export function sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        if (aVal < bVal)
            return order === 'asc' ? -1 : 1;
        if (aVal > bVal)
            return order === 'asc' ? 1 : -1;
        return 0;
    });
}
/**
 * Remove duplicates from array by key
 */
export function uniqueBy(array, key) {
    const seen = new Set();
    return array.filter(item => {
        const k = typeof key === 'function' ? key(item) : String(item[key]);
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
/**
 * Deep clone object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Omit keys from object
 */
export function omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
}
/**
 * Pick keys from object
 */
export function pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
        if (key in obj)
            result[key] = obj[key];
    });
    return result;
}
// ============================================
// Validation Utilities
// ============================================
/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value) {
    if (value === null || value === undefined)
        return true;
    if (typeof value === 'string')
        return value.trim() === '';
    if (Array.isArray(value))
        return value.length === 0;
    if (typeof value === 'object')
        return Object.keys(value).length === 0;
    return false;
}
/**
 * Check if string is valid UUID
 */
export function isValidUuid(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Check if string is valid email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Check if string is valid phone (Indian format)
 */
export function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
}
/**
 * Check if string is valid GSTIN
 */
export function isValidGstin(gstin) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
}
// ============================================
// File Utilities
// ============================================
/**
 * Format file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * Get file extension
 */
export function getFileExtension(filename) {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}
/**
 * Check if file type is allowed
 */
export function isAllowedFileType(mimeType, allowedTypes) {
    return allowedTypes.includes(mimeType);
}
// ============================================
// Async Utilities
// ============================================
/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry function with exponential backoff
 */
export async function retry(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry = () => true } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries || !shouldRetry(lastError)) {
                throw lastError;
            }
            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            await sleep(delay);
        }
    }
    throw lastError;
}
/**
 * Run promises in parallel with concurrency limit
 */
export async function parallelLimit(tasks, limit) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const promise = task().then(result => {
            results.push(result);
        });
        executing.push(promise);
        if (executing.length >= limit) {
            await Promise.race(executing);
            // Remove settled promises
            const settled = executing.filter(p => p !== Promise.race(executing));
            executing.splice(0, executing.length, ...executing.filter(p => !settled.includes(p)));
        }
    }
    await Promise.all(executing);
    return results;
}
// ============================================
// Environment Utilities
// ============================================
/**
 * Get environment variable with default
 */
export function getEnv(key, defaultValue = '') {
    return process.env[key] || defaultValue;
}
/**
 * Check if running in development
 */
export function isDevelopment() {
    return process.env.NODE_ENV === 'development';
}
/**
 * Check if running in production
 */
export function isProduction() {
    return process.env.NODE_ENV === 'production';
}
/**
 * Check if running in test
 */
export function isTest() {
    return process.env.NODE_ENV === 'test';
}
//# sourceMappingURL=index.js.map