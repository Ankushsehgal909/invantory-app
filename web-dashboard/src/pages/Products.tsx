import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Download, Upload, Edit, Trash2, Archive } from 'lucide-react';
import { apiHelpers } from '../services/api';
import { Product, ProductStatus } from '@shopstock/shared/types';
import toast from 'react-hot-toast';
import { formatCurrency } from '@shopstock/shared/utils';
import { ProductForm } from '../components/ProductForm';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ product: Product; force?: boolean } | null>(null);
  const [archiveDialog, setArchiveDialog] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, status, page }],
    queryFn: () => apiHelpers.getProducts({ search, status, page, limit: 20 }),
    select: (response) => response.data,
  });

  const createMutation = useMutation({
    mutationFn: (product: any) => apiHelpers.createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      setShowForm(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiHelpers.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      setEditingProduct(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => apiHelpers.deleteProduct(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setDeleteDialog(null);
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === 'CANNOT_DELETE_WITH_HISTORY') {
        toast.error('Product has transaction history. Use archive or force delete.');
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to delete product');
      }
      setDeleteDialog(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.updateProduct(id, { status: ProductStatus.ARCHIVED }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product archived successfully');
      setArchiveDialog(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to archive product'),
  });

  const handleExport = async () => {
    try {
      const response = await apiHelpers.exportProducts({ search, status });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export completed');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const response = await apiHelpers.importProducts(text, false);
      const { success, failed, errors } = response.data.data;
      toast.success(`Import completed: ${success} succeeded, ${failed} failed`);
      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch {
      toast.error('Import failed');
    }
    event.target.value = '';
  };

  const handleDelete = (product: Product, force = false) => {
    setDeleteDialog({ product, force });
  };

  const handleArchive = (product: Product) => {
    setArchiveDialog(product);
  };

  if (isLoading && !data) {
    return <div className="animate-pulse space-y-4">{" ".repeat(10).split(" ").map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="sr-only"
              id="import-file"
            />
            <label htmlFor="import-file" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import CSV
            </label>
          </div>
          <button
            onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, SKU, barcode..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
          >
            <option value="">All Status</option>
            <option value={ProductStatus.ACTIVE}>Active</option>
            <option value={ProductStatus.ARCHIVED}>Archived</option>
            <option value={ProductStatus.DELETED}>Deleted</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU / Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.products?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No products found</td>
                </tr>
              ) : (
                data?.products?.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-gray-900">{product.sku}</p>
                      {product.barcode && <p className="text-xs text-gray-500 font-mono">{product.barcode}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.category?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${product.currentStock <= 0 ? 'text-red-600' : product.currentStock <= product.reorderLevel ? 'text-amber-600' : 'text-gray-900'}`}>
                          {product.currentStock} {product.unit}
                        </span>
                        {product.currentStock <= product.reorderLevel && product.currentStock > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Low</span>
                        )}
                        {product.currentStock <= 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Out</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                      <p className="text-xs text-gray-500">Cost: {formatCurrency(product.purchaseCost)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === ProductStatus.ACTIVE ? 'bg-green-100 text-green-700' :
                        product.status === ProductStatus.ARCHIVED ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingProduct(product); setShowForm(true); }}
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(product)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (data.meta.totalPages > 1) && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.meta.total)} of {data.meta.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
          onSubmit={editingProduct ? updateMutation.mutate : createMutation.mutate}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {deleteDialog && (
        <ConfirmDialog
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteDialog.product.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => deleteMutation.mutate({ id: deleteDialog.product.id, force: deleteDialog.force })}
          onCancel={() => setDeleteDialog(null)}
          isLoading={deleteMutation.isPending}
          showForceOption={!!deleteDialog.product._count?.batches}
          onForceToggle={(force) => setDeleteDialog(d => d ? { ...d, force } : null)}
        />
      )}

      {archiveDialog && (
        <ConfirmDialog
          title="Archive Product"
          message={`Are you sure you want to archive "${archiveDialog.name}"? Archived products are hidden from the catalog but retained for historical records.`}
          confirmText="Archive"
          cancelText="Cancel"
          onConfirm={() => archiveMutation.mutate(archiveDialog.id)}
          onCancel={() => setArchiveDialog(null)}
          isLoading={archiveMutation.isPending}
        />
      )}
    </div>
  );
}