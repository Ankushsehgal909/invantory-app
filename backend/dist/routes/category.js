"use strict";
/**
 * Category Routes
 * Category CRUD with hierarchy support
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("@shopstock/shared/validators");
const requestLogger_1 = require("../middleware/requestLogger");
const router = (0, express_1.Router)();
// ============================================
// List Categories (Flat)
// ============================================
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { includeInactive } = req.query;
    const where = { shopId };
    if (includeInactive !== 'true')
        where.isActive = true;
    const categories = await index_1.prisma.category.findMany({
        where,
        include: {
            _count: { select: { products: true, children: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: { categories } });
}));
// ============================================
// List Categories (Tree)
// ============================================
router.get('/tree', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const categories = await index_1.prisma.category.findMany({
        where: { shopId, isActive: true, parentId: null },
        include: {
            children: {
                where: { isActive: true },
                include: {
                    children: {
                        where: { isActive: true },
                        include: {
                            _count: { select: { products: true } },
                        },
                    },
                    _count: { select: { products: true } },
                },
            },
            _count: { select: { products: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: { categories } });
}));
// ============================================
// Get Category by ID
// ============================================
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const category = await index_1.prisma.category.findFirst({
        where: { id, shopId },
        include: {
            parent: { select: { id: true, name: true } },
            children: { select: { id: true, name: true } },
            _count: { select: { products: true } },
        },
    });
    if (!category) {
        throw new errorHandler_1.NotFoundError('Category');
    }
    res.json({ success: true, data: { category } });
}));
// ============================================
// Create Category
// ============================================
router.post('/', (0, auth_1.requirePermission)('MANAGE_CATEGORIES'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const validation = validators_1.createCategorySchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    // Check name uniqueness within shop
    const existing = await index_1.prisma.category.findFirst({
        where: { shopId, name: validation.data.name },
    });
    if (existing) {
        throw new errorHandler_1.ValidationError('Category name already exists');
    }
    // Validate parent exists and belongs to same shop
    if (validation.data.parentId) {
        const parent = await index_1.prisma.category.findFirst({
            where: { id: validation.data.parentId, shopId },
        });
        if (!parent) {
            throw new errorHandler_1.ValidationError('Parent category not found');
        }
    }
    // Get max sort order
    const maxSort = await index_1.prisma.category.findFirst({
        where: { shopId, parentId: validation.data.parentId || null },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
    });
    const category = await index_1.prisma.category.create({
        data: {
            ...validation.data,
            shopId,
            sortOrder: (maxSort?.sortOrder || 0) + 1,
        },
        include: {
            parent: { select: { id: true, name: true } },
        },
    });
    (0, requestLogger_1.logCreate)(req, 'Category', category.id, validation.data);
    res.status(201).json({ success: true, data: { category } });
}));
// ============================================
// Update Category
// ============================================
router.put('/:id', (0, auth_1.requirePermission)('MANAGE_CATEGORIES'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const validation = validators_1.updateCategorySchema.safeParse(req.body);
    if (!validation.success) {
        throw new errorHandler_1.ValidationError('Invalid input', { errors: validation.error.errors });
    }
    const category = await index_1.prisma.category.findFirst({
        where: { id, shopId },
    });
    if (!category) {
        throw new errorHandler_1.NotFoundError('Category');
    }
    // Check name uniqueness
    if (validation.data.name && validation.data.name !== category.name) {
        const existing = await index_1.prisma.category.findFirst({
            where: { shopId, name: validation.data.name, id: { not: id } },
        });
        if (existing) {
            throw new errorHandler_1.ValidationError('Category name already exists');
        }
    }
    // Validate parent
    if (validation.data.parentId) {
        if (validation.data.parentId === id) {
            throw new errorHandler_1.ValidationError('Category cannot be its own parent');
        }
        const parent = await index_1.prisma.category.findFirst({
            where: { id: validation.data.parentId, shopId },
        });
        if (!parent) {
            throw new errorHandler_1.ValidationError('Parent category not found');
        }
        // Check for circular reference
        let currentParentId = validation.data.parentId ?? null;
        while (currentParentId) {
            if (currentParentId === id) {
                throw new errorHandler_1.ValidationError('Circular reference detected');
            }
            const parentCat = await index_1.prisma.category.findUnique({
                where: { id: currentParentId },
                select: { parentId: true },
            });
            currentParentId = parentCat?.parentId ?? null;
        }
    }
    const updatedCategory = await index_1.prisma.category.update({
        where: { id },
        data: validation.data,
        include: {
            parent: { select: { id: true, name: true } },
        },
    });
    (0, requestLogger_1.logUpdate)(req, 'Category', id, {}, validation.data);
    res.json({ success: true, data: { category: updatedCategory } });
}));
// ============================================
// Delete Category
// ============================================
router.delete('/:id', (0, auth_1.requirePermission)('MANAGE_CATEGORIES'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { id } = req.params;
    const category = await index_1.prisma.category.findFirst({
        where: { id, shopId },
        include: {
            _count: { select: { products: true, children: true } },
        },
    });
    if (!category) {
        throw new errorHandler_1.NotFoundError('Category');
    }
    // Check if category has products or children
    if (category._count.products > 0 || category._count.children > 0) {
        throw new errorHandler_1.ValidationError('Cannot delete category with products or subcategories. Reassign them first.');
    }
    await index_1.prisma.category.delete({ where: { id } });
    (0, requestLogger_1.logDelete)(req, 'Category', id, {});
    res.json({ success: true, data: { message: 'Category deleted successfully' } });
}));
// ============================================
// Reorder Categories
// ============================================
router.post('/reorder', (0, auth_1.requirePermission)('MANAGE_CATEGORIES'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const shopId = req.user?.shopId;
    const { categoryOrders } = req.body; // Array of { id, sortOrder, parentId }
    if (!Array.isArray(categoryOrders)) {
        throw new errorHandler_1.ValidationError('categoryOrders must be an array');
    }
    await index_1.prisma.$transaction(categoryOrders.map(({ id, sortOrder, parentId }) => index_1.prisma.category.update({
        where: { id, shopId },
        data: { sortOrder, parentId },
    })));
    (0, requestLogger_1.logAction)(req, 'REORDER', 'Category', categoryOrders.map(c => c.id).join(','));
    res.json({ success: true, data: { message: 'Categories reordered successfully' } });
}));
exports.default = router;
//# sourceMappingURL=category.js.map