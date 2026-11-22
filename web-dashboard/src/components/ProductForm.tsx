import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Product, UnitOfMeasure, ExpiryMode, ProductStatus } from '@shopstock/shared/types';
import toast from 'react-hot-toast';

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function ProductForm({ product, onClose, onSubmit, isLoading }: ProductFormProps) {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      brand: '',
      description: '',
      unit: UnitOfMeasure.PIECE,
      purchaseCost: 0,
      sellingPrice: 0,
      taxRate: 0,
      reorderLevel: 0,
      openingStock: 0,
      expiryMode: ExpiryMode.NONE,
      status: ProductStatus.ACTIVE,
      imageUrl: '',
      ...product,
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        categoryId: product.categoryId || '',
        brand: product.brand || '',
        description: product.description || '',
        unit: product.unit,
        purchaseCost: product.purchaseCost / 100,
        sellingPrice: product.sellingPrice / 100,
        taxRate: product.taxRate || 0,
        reorderLevel: product.reorderLevel,
        openingStock: product.openingStock,
        expiryMode: product.expiryMode,
        status: product.status,
        imageUrl: product.imageUrl || '',
      });
    } else {
      reset({
        name: '',
        sku: '',
        barcode: '',
        categoryId: '',
        brand: '',
        description: '',
        unit: UnitOfMeasure.PIECE,
        purchaseCost: 0,
        sellingPrice: 0,
        taxRate: 0,
        reorderLevel: 0,
        openingStock: 0,
        expiryMode: ExpiryMode.NONE,
        status: ProductStatus.ACTIVE,
        imageUrl: '',
      });
    }
  }, [product, reset]);

  useEffect(() => {
    api.get('/categories', { params: { limit: 1000, isActive: true } })
      .then(res => setCategories(res.data.data.categories))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  const onSubmitForm = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Convert currency to minor units
      const submitData = {
        ...data,
        purchaseCost: Math.round(data.purchaseCost * 100),
        sellingPrice: Math.round(data.sellingPrice * 100),
      };
      onSubmit(product ? { id: product.id, data: submitData } : submitData);
    } catch (error) {
      toast.error('Invalid input');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmitForm)} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || isLoading}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    {...register('sku', { required: 'SKU is required', pattern: /^[A-Z0-9\-_]{1,50}$/ })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.sku ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || isLoading}
                  />
                  {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    {...register('barcode', { pattern: /^[0-9]{8,14}$/ })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.barcode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || isLoading}
                  />
                  {errors.barcode && <p className="mt-1 text-sm text-red-600">{errors.barcode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    {...register('categoryId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    {...register('brand')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isSubmitting || isLoading}
                />
              </div>
            </div>

            {/* Inventory & Pricing */}
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-900">Inventory & Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    {...register('unit')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  >
                    {Object.values(UnitOfMeasure).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('purchaseCost', { required: 'Required', min: 0 })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.purchaseCost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || isLoading}
                  />
                  {errors.purchaseCost && <p className="mt-1 text-sm text-red-600">{errors.purchaseCost.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('sellingPrice', { required: 'Required', min: 0 })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.sellingPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting || isLoading}
                  />
                  {errors.sellingPrice && <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register('taxRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    {...register('reorderLevel')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('openingStock')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Mode</label>
                  <select
                    {...register('expiryMode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  >
                    {Object.values(ExpiryMode).map(e => (
                      <option key={e} value={e}>{e.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  >
                    {Object.values(ProductStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    {...register('imageUrl')}
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting || isLoading}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={isSubmitting || isLoading}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}