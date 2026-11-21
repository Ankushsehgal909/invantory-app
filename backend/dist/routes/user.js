"use strict";
/**
 * User Routes
 * User management (owner/manager only)
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
const requestLogger_1 = require("../middleware/requestLogger");
const router = (0, express_1.Router)();
// ============================================
// List Users
// ============================================
router.get('/', (0, auth_1.requirePermission)('MANAGE_USERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { page = 1, limit = 20, search, role, status } = req.query;
    const where = { shopId };
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (role)
        where.role = role;
    if (status)
        where.status = status;
    const [users, total] = await Promise.all([
        index_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                status: true,
                avatar: true,
                lastLoginAt: true,
                createdAt: true,
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        }),
        index_1.prisma.user.count({ where }),
    ]);
    res.json({
        success: true,
        data: { users },
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
            hasNext: Number(page) < Math.ceil(total / Number(limit)),
            hasPrev: Number(page) > 1,
        },
    });
}));
// ============================================
// Get User by ID
// ============================================
router.get('/:id', (0, auth_1.requirePermission)('MANAGE_USERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const user = await index_1.prisma.user.findFirst({
        where: { id, shopId },
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            status: true,
            avatar: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user) {
        throw new errorHandler_1.NotFoundError('User');
    }
    res.json({ success: true, data: { user } });
}));
// ============================================
// Create User
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_USERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const validation = validators_1.createUserSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const { phone, email, password, ...rest } = validation.data;
    // Check for duplicates
    const existing = await index_1.prisma.user.findFirst({
        where: {
            shopId,
            OR: [
                ...(phone ? [{ phone }] : []),
                ...(email ? [{ email }] : []),
            ],
        },
    });
    if (existing) {
        throw new errorHandler_1.ConflictError('Phone or email already exists');
    }
    // Hash password
    const passwordHash = await bcryptjs_1.default.hash(password, config_1.config.security.bcryptRounds);
    const user = await index_1.prisma.user.create({
        data: {
            ...rest,
            shopId,
            phone,
            email,
            passwordHash,
        },
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
        },
    });
    (0, requestLogger_1.logCreate)(req, 'User', user.id, validation.data);
    res.status(201).json({ success: true, data: { user } });
}));
// ============================================
// Update User
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('MANAGE_USERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const validation = validators_1.updateUserSchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const user = await index_1.prisma.user.findFirst({
        where: { id, shopId },
    });
    if (!user) {
        throw new errorHandler_1.NotFoundError('User');
    }
    // Prevent owner from being demoted
    if (user.role === auth_1.UserRole.OWNER && validation.data.role && validation.data.role !== auth_1.UserRole.OWNER) {
        throw new errorHandler_1.ValidationError('Cannot change owner role');
    }
    // Prevent self-demotion
    const currentUserId = req.user?.id;
    if (id === currentUserId && validation.data.role && validation.data.role !== auth_1.UserRole.OWNER) {
        throw new errorHandler_1.ValidationError('Cannot change your own role');
    }
    // Check for duplicates
    if (validation.data.phone || validation.data.email) {
        const existing = await index_1.prisma.user.findFirst({
            where: {
                shopId,
                id: { not: id },
                OR: [
                    ...(validation.data.phone ? [{ phone: validation.data.phone }] : []),
                    ...(validation.data.email ? [{ email: validation.data.email }] : []),
                ],
            },
        });
        if (existing) {
            throw new errorHandler_1.ConflictError('Phone or email already exists');
        }
    }
    const updatedUser = await index_1.prisma.user.update({
        where: { id },
        data: validation.data,
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            status: true,
            avatar: true,
            updatedAt: true,
        },
    });
    (0, requestLogger_1.logUpdate)(req, 'User', id, {}, validation.data);
    res.json({ success: true, data: { user: updatedUser } });
}));
// ============================================
// Delete User (Soft Delete - Deactivate)
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_USERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const user = await index_1.prisma.user.findFirst({
        where: { id, shopId },
    });
    if (!user) {
        throw new errorHandler_1.NotFoundError('User');
    }
    // Prevent self-deletion
    if (id === currentUserId) {
        throw new errorHandler_1.ValidationError('Cannot delete your own account');
    }
    // Prevent owner deletion
    if (user.role === auth_1.UserRole.OWNER) {
        throw new errorHandler_1.ValidationError('Cannot delete owner account');
    }
    // Soft delete - deactivate
    await index_1.prisma.user.update({
        where: { id },
        data: { status: constants_1.UserStatus.INACTIVE },
    });
    (0, requestLogger_1.logDelete)(req, 'User', id, {});
    res.json({ success: true, data: { message: 'User deactivated successfully' } });
}));
// ============================================
// Reset User Password
// ============================================
router.post('/:id/reset-password', (0, auth_1.requirePermission)('MANAGE_USERS'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
        throw new errorHandler_1.ValidationError('New password must be at least 8 characters');
    }
    const user = await index_1.prisma.user.findFirst({
        where: { id, shopId },
    });
    if (!user) {
        throw new errorHandler_1.NotFoundError('User');
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, config_1.config.security.bcryptRounds);
    await index_1.prisma.user.update({
        where: { id },
        data: { passwordHash },
    });
    (0, requestLogger_1.logAction)(req, 'RESET_PASSWORD', 'User', id);
    res.json({ success: true, data: { message: 'Password reset successfully' } });
}));
exports.default = router;
//# sourceMappingURL=user.js.map