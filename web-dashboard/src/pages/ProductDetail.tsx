import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiHelpers } from '../services/api';
import { Product, SalesInvoice } from '@shopstock/shared/types';
import { formatCurrency, formatDate } from '@shopstock/shared/utils';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Tag,
  AlertTriangle,
  DollarSign,
  Calendar,
  Truck,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProductDetailProps {
  initialProduct?: Product;
}

export function ProductDetail({ initialProduct }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [salesHistory, setSalesHistory] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(!initialProduct);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!initialProduct && id) {
      fetchProduct();
    }
  }, [id, initialProduct]);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiHelpers.getProduct(id!);
      setProduct(response.data.data.product);
      // Fetch sales history for this product
      const salesResponse = await apiHelpers.getSales({ productId: id, limit: 20 });
      setSalesHistory(salesResponse.data.data.invoices || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this product?')) return;

    try {
      setDeleting(true);
      await apiHelpers.deleteProduct(id);
      toast.success('Product deleted successfully');
      navigate('/products');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Product not found</h3>
        <p className="text-gray-500 mt-1">The product you're looking for doesn't exist.</p>
        <Link to="/products" className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Products
        </Link>
      </div>
    );
  }

  const isLowStock = product.currentStock > 0 && product.currentStock <= product.reorderLevel;
  const isOutOfStock = product.currentStock <= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/products" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-500">SKU: {product.sku} {product.barcode ? `• Barcode: ${product.barcode}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/products/${product.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
          product.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {product.status}
        </span>
        {isLowStock && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </span>
        )}
        {isOutOfStock && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3" />
            Out of Stock
          </span>
        )}
        {product.expiryMode !== 'NONE' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Calendar className="h-3 w-3" />
            Batch Tracked
          </span>
        )}
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stock Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-500" />
            Stock Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className={`text-3xl font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                {product.currentStock} {product.unit}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reorder Level</p>
              <p className="text-3xl font-bold text-gray-900">{product.reorderLevel} {product.unit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Value (Cost)</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(product.currentStock * product.purchaseCost)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Value (Sale)</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(product.currentStock * product.sellingPrice)}</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            Pricing
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Purchase Cost</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(product.purchaseCost)} / {product.unit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Selling Price</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(product.sellingPrice)} / {product.unit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tax Rate</p>
              <p className="text-xl font-semibold text-gray-900">{product.taxRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Margin</p>
              <p className="text-xl font-semibold text-gray-900">
                {product.sellingPrice > product.purchaseCost
                  ? `${(((product.sellingPrice - product.purchaseCost) / product.sellingPrice) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary-500" />
            Details
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium text-gray-900">{product.category?.name || 'Uncategorized'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Brand</p>
              <p className="font-medium text-gray-900">{product.brand || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Unit</p>
              <p className="font-medium text-gray-900">{product.unit}</p>
            </div>
            {product.expiryMode !== 'NONE' && (
              <div>
                <p className="text-sm text-gray-500">Expiry Mode</p>
                <p className="font-medium text-gray-900">{product.expiryMode}</p>
              </div>
            )}
            {product.weight && (
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="font-medium text-gray-900">{product.weight} kg</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      {/* Batches */}
      {product.batches && product.batches.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-500" />
              Batches ({product.batches.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.batches
                  .filter(b => b.quantityAvailable > 0)
                  .sort((a, b) => new Date(a.expiryDate || '9999-12-31').getTime() - new Date(b.expiryDate || '9999-12-31').getTime())
                  .map(batch => {
                    const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                    const daysToExpiry = batch.expiryDate
                      ? Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <tr key={batch.id} className={isExpired ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 font-mono text-sm text-gray-900">{batch.batchNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{batch.quantityAvailable} {product.unit}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {batch.expiryDate ? formatDate(batch.expiryDate) : 'No Expiry'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(batch.unitCost)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(batch.quantityAvailable * batch.unitCost)}</td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          ) : daysToExpiry !== null && daysToExpiry <= 30 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {daysToExpiry} days left
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sales */}
      {salesHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-500" />
              Recent Sales ({salesHistory.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesHistory.map(invoice => {
                  const item = invoice.items?.find(i => i.productId === product.id);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link to={`/sales/${invoice.id}`} className="font-mono text-sm text-primary-600 hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{invoice.customer?.businessName || 'Walk-in'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item?.quantity ?? 0} {product.unit}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item ? formatCurrency(item.unitPrice) : '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item ? formatCurrency(item.lineTotal) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;