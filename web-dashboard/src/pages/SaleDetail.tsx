import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiHelpers } from '../services/api';
import { SalesInvoice } from '@shopstock/shared/types';
import { formatCurrency, formatDate } from '@shopstock/shared/utils';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CreditCard,
  DollarSign,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SaleDetailProps {
  initialInvoice?: SalesInvoice;
}

export function SaleDetail({ initialInvoice }: SaleDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(initialInvoice || null);
  const [loading, setLoading] = useState(!initialInvoice);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!initialInvoice && id) {
      fetchInvoice();
    }
  }, [id, initialInvoice]);

  const fetchInvoice = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiHelpers.getSalesInvoice(id!);
      setInvoice(response.data.data.invoice);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch invoice');
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this sales invoice?')) return;

    try {
      setDeleting(true);
      await apiHelpers.deleteSalesInvoice(id);
      toast.success('Sales invoice deleted successfully');
      navigate('/sales');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const response = await apiHelpers.exportSalesInvoice(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; icon: any }> = {
      DRAFT: { class: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      FINALIZED: { class: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      CANCELLED: { class: 'bg-red-100 text-red-800', icon: XCircle },
      RETURNED: { class: 'bg-purple-100 text-purple-800', icon: RotateCcw },
    };
    return badges[status] || { class: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; icon: any }> = {
      UNPAID: { class: 'bg-red-100 text-red-800', icon: XCircle },
      PARTIALLY_PAID: { class: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      PAID: { class: 'bg-green-100 text-green-800', icon: CheckCircle },
      REFUNDED: { class: 'bg-purple-100 text-purple-800', icon: RotateCcw },
    };
    return badges[status] || { class: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Invoice not found</h3>
        <p className="text-gray-500 mt-1">The invoice you're looking for doesn't exist.</p>
        <Link to="/sales" className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sales
        </Link>
      </div>
    );
  }

  const StatusIcon = getStatusBadge(invoice.status).icon;
  const PaymentStatusIcon = getPaymentStatusBadge(invoice.paymentStatus).icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/sales" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-gray-500 font-mono text-lg">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/sales/${invoice.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
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
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(invoice.status).class}`}>
          <StatusIcon className="h-4 w-4" />
          {invoice.status}
        </span>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadge(invoice.paymentStatus).class}`}>
          <PaymentStatusIcon className="h-4 w-4" />
          {invoice.paymentStatus.replace('_', ' ')}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary-500" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{invoice.customer?.businessName || 'Walk-in Customer'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-medium text-gray-900">{invoice.customer?.contactPerson || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{invoice.customer?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{invoice.customer?.email || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Billing Address</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{invoice.customer?.billingAddress || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Shipping Address</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{invoice.customer?.shippingAddress || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GSTIN</p>
                <p className="font-medium text-gray-900">{invoice.customer?.gstin || '—'}</p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-500" />
              Invoice Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="font-medium text-gray-900 font-mono">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-medium text-gray-900">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium text-gray-900">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Terms</p>
                <p className="font-medium text-gray-900">{invoice.terms || '—'}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{invoice.notes || '—'}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <p className="text-sm text-gray-500">Terms</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{invoice.terms || '—'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary-500" />
                Items ({invoice.items?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items?.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.productNameSnapshot || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-500 font-mono">{item.skuSnapshot}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.batchNumber || '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {item.quantity} {item.unit || ''}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.discount || 0)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.tax || 0)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Totals Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-600">- {formatCurrency(invoice.discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Additional Charges</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoice.additionalCharges || 0)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Grand Total</span>
                  <span className="text-primary-600">{formatCurrency(invoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid Amount</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Balance Due</span>
                <span className="font-medium text-red-600">{formatCurrency(invoice.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Payments */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary-500" />
                Payments ({invoice.payments.length})
              </h3>
              <div className="space-y-3">
                {invoice.payments.map(payment => (
                  <div key={payment.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{payment.method}</p>
                        <p className="text-sm text-gray-500">{formatDate(payment.paidAt)}</p>
                        {payment.referenceNumber && (
                          <p className="text-sm text-gray-500 font-mono">Ref: {payment.referenceNumber}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SaleDetail;