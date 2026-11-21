"use strict";
/**
 * Authentication Routes
 * Login, logout, token refresh, password management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("@shopstock/shared/validators");
const constants_1 = require("@shopstock/shared/constants");
const logger_1 = require("../utils/logger");
const requestLogger_1 = require("../middleware/requestLogger");
const router = (0, express_1.Router)();
// ============================================
// Login
// ============================================
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validation = validators_1.loginSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid credentials', { errors: validation.error.errors });
    }
    const { phone, password, shopId } = validation.data;
    // Find user by phone
    const user = await index_1.prisma.user.findFirst({
        where: {
            phone,
            ...(shopId ? { shopId } : {}),
            status: constants_1.UserStatus.ACTIVE,
        },
        include: {
            shop: {
                select: {
                    id: true,
                    name: true,
                    currency: true,
                    timezone: true,
                    invoicePrefix: true,
                    purchasePrefix: true,
                    taxSettings: true,
                    settings: true,
                },
            },
        },
    });
    if (!user) {
        logger_1.logger.warn('Login failed: user not found', { phone });
        throw new errorHandler_1.AuthenticationError('Invalid phone or password');
    }
    // Verify password
    const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isValid) {
        logger_1.logger.warn('Login failed: invalid password', { userId: user.id });
        throw new errorHandler_1.AuthenticationError('Invalid phone or password');
    }
    // Update last login
    await index_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    // Generate tokens
    const accessToken = (0, auth_1.generateAccessToken)({
        userId: user.id,
        shopId: user.shopId,
        role: user.role,
    });
    const refreshToken = (0, auth_1.generateRefreshToken)({
        userId: user.id,
        shopId: user.shopId,
        role: user.role,
    });
    // Log login
    (0, requestLogger_1.logAction)(req, 'LOGIN', 'User', user.id);
    logger_1.logger.info('User logged in', { userId: user.id, shopId: user.shopId });
    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                shopId: user.shopId,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            accessToken,
            refreshToken,
            shop: user.shop,
        },
    });
}));
// ============================================
// Refresh Token
// ============================================
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new errorHandler_1.ValidationError('Refresh token is required');
    }
    let payload;
    try {
        payload = (0, auth_1.verifyRefreshToken)(refreshToken);
    }
    catch (error) {
        throw new errorHandler_1.AuthenticationError('Invalid or expired refresh token');
    }
    // Verify user still exists and is active
    const user = await index_1.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, shopId: true, role: true, status: true },
    });
    if (!user || user.status !== constants_1.UserStatus.ACTIVE) {
        throw new errorHandler_1.AuthenticationError('User not found or deactivated');
    }
    // Generate new tokens
    const newAccessToken = (0, auth_1.generateAccessToken)({
        userId: user.id,
        shopId: user.shopId,
        role: user.role,
    });
    const newRefreshToken = (0, auth_1.generateRefreshToken)({
        userId: user.id,
        shopId: user.shopId,
        role: user.role,
    });
    res.json({
        success: true,
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        },
    });
}));
// ============================================
// Logout
// ============================================
router.post('/logout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // In a stateless JWT system, logout is client-side
    // For enhanced security, you could maintain a blocklist of revoked tokens
    res.json({
        success: true,
        data: { message: 'Logged out successfully' },
    });
}));
// ============================================
// Change Password
// ============================================
router.post('/change-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validation = validators_1.changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const { currentPassword, newPassword } = validation.data;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AuthenticationError();
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });
    if (!user) {
        throw new errorHandler_1.AuthenticationError('User not found');
    }
    // Verify current password
    const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        throw new errorHandler_1.AuthenticationError('Current password is incorrect');
    }
    // Hash new password
    const passwordHash = await bcryptjs_1.default.hash(newPassword, config_1.config.security.bcryptRounds);
    // Update password
    await index_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
    });
    (0, requestLogger_1.logAction)(req, 'CHANGE_PASSWORD', 'User', userId);
    logger_1.logger.info('Password changed', { userId });
    res.json({
        success: true,
        data: { message: 'Password changed successfully' },
    });
}));
// ============================================
// Get Current User
// ============================================
router.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AuthenticationError();
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            shopId: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            avatar: true,
            lastLoginAt: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw new errorHandler_1.AuthenticationError('User not found');
    }
    res.json({
        success: true,
        data: { user },
    });
}));
// ============================================
// Forgot Password (Request Reset)
// ============================================
router.post('/forgot-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        throw new errorHandler_1.ValidationError('Phone number is required');
    }
    // Find user
    const user = await index_1.prisma.user.findFirst({
        where: { phone, status: constants_1.UserStatus.ACTIVE },
    });
    // Always return success to prevent user enumeration
    // In production, send reset link via SMS/email
    logger_1.logger.info('Password reset requested', { phone, userId: user?.id });
    res.json({
        success: true,
        data: { message: 'If the account exists, a password reset link has been sent' },
    });
}));
// ============================================
// Reset Password
// ============================================
router.post('/reset-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        throw new errorHandler_1.ValidationError('Token and new password are required');
    }
    // In production, verify token from database
    // For now, we'll just return success
    // Implementation would involve:
    // 1. Verify reset token
    // 2. Hash new password
    // 3. Update user
    // 4. Invalidate token
    res.json({
        success: true,
        data: { message: 'Password reset successfully' },
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map