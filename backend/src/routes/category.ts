/**
 * Category Routes
 * Category CRUD with hierarchy support
 */

import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { requirePermission, PERMISSIONS } from '../middleware/auth';
import { createCategorySchema, updateCategorySchema } from '@shopstock/shared/validators';
import { logCreate, logUpdate, logDelete } from '../middleware/requestLogger';

const router = Router();

// ============================================
// List Categories (Flat)
// ============================================

router.get('/', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { includeInactive } = req.query;

  const where: any = { shopId };
  if (includeInactive !== 'true') where.isActive = true;

  const categories = await prisma.category.findMany({
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

router.get('/tree', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;

  const categories = await prisma.category.findMany({
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

router.get('/:id', asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const category = await prisma.category.findFirst({
    where: { id, shopId },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  res.json({ success: true, data: { category } });
}));

// ============================================
// Create Category
// ============================================

router.post('/', requirePermission('MANAGE_CATEGORIES'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const validation = createCategorySchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  // Check name uniqueness within shop
  const existing = await prisma.category.findFirst({
    where: { shopId, name: validation.data.name },
  });

  if (existing) {
    throw new ValidationError('Category name already exists');
  }

  // Validate parent exists and belongs to same shop
  if (validation.data.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: validation.data.parentId, shopId },
    });

    if (!parent) {
      throw new ValidationError('Parent category not found');
    }
  }

  // Get max sort order
  const maxSort = await prisma.category.findFirst({
    where: { shopId, parentId: validation.data.parentId || null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      ...validation.data,
      shopId,
      sortOrder: (maxSort?.sortOrder || 0) + 1,
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  logCreate(req, 'Category', category.id, validation.data);

  res.status(201).json({ success: true, data: { category } });
}));

// ============================================
// Update Category
// ============================================

router.put('/:id', requirePermission('MANAGE_CATEGORIES'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;
  const validation = updateCategorySchema.safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid input', { errors: validation.error.errors });
  }

  const category = await prisma.category.findFirst({
    where: { id, shopId },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  // Check name uniqueness
  if (validation.data.name && validation.data.name !== category.name) {
    const existing = await prisma.category.findFirst({
      where: { shopId, name: validation.data.name, id: { not: id } },
    });

    if (existing) {
      throw new ValidationError('Category name already exists');
    }
  }

  // Validate parent
  if (validation.data.parentId) {
    if (validation.data.parentId === id) {
      throw new ValidationError('Category cannot be its own parent');
    }

    const parent = await prisma.category.findFirst({
      where: { id: validation.data.parentId, shopId },
    });

    if (!parent) {
      throw new ValidationError('Parent category not found');
    }

    // Check for circular reference
    let currentParentId = validation.data.parentId;
    while (currentParentId) {
      if (currentParentId === id) {
        throw new ValidationError('Circular reference detected');
      }
      const parentCat = await prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      currentParentId = parentCat?.parentId || null;
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: validation.data,
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  logUpdate(req, 'Category', id, {}, validation.data);

  res.json({ success: true, data: { category: updatedCategory } });
}));

// ============================================
// Delete Category
// ============================================

router.delete('/:id', requirePermission('MANAGE_CATEGORIES'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { id } = req.params;

  const category = await prisma.category.findFirst({
    where: { id, shopId },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  // Check if category has products or children
  if (category._count.products > 0 || category._count.children > 0) {
    throw new ValidationError('Cannot delete category with products or subcategories. Reassign them first.');
  }

  await prisma.category.delete({ where: { id } });

  logDelete(req, 'Category', id, {});

  res.json({ success: true, data: { message: 'Category deleted successfully' } });
}));

// ============================================
// Reorder Categories
// ============================================

router.post('/reorder', requirePermission('MANAGE_CATEGORIES'), asyncHandler(async (req, res) => {
  const shopId = (req as any).user?.shopId;
  const { categoryOrders } = req.body; // Array of { id, sortOrder, parentId }

  if (!Array.isArray(categoryOrders)) {
    throw new ValidationError('categoryOrders must be an array');
  }

  await prisma.$transaction(
    categoryOrders.map(({ id, sortOrder, parentId }: { id: string; sortOrder: number; parentId?: string }) =>
      prisma.category.update({
        where: { id, shopId },
        data: { sortOrder, parentId },
      })
    )
  );

  logAction(req, 'REORDER', 'Category', categoryOrders.map(c => c.id).join(','));

  res.json({ success: true, data: { message: 'Categories reordered successfully' } });
}));

export default router;