import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { apiHelpers } from '../services/api';
import { Supplier, LedgerEntry } from '@shopstock/shared/types';
import { formatCurrency, formatDate } from '@shopstock/shared/utils';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Truck,
  DollarSign,
  Package,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SupplierDetailProps {
  initialSupplier?: Supplier;
}

export function SupplierDetail({ initialSupplier }: SupplierDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(initialSupplier || null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(!initialSupplier);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerMeta, setLedgerMeta] = useState<{ total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } | null>(null);

  const tab = searchParams.get('tab') || 'overview';
  useEffect(() => {
    if (!initialSupplier && id) {
      fetchSupplier();
      fetchLedger();
    }
  }, [id, initialSupplier, ledgerPage]);

  const fetchSupplier = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiHelpers.getSupplier(id!);
      setSupplier(response.data.data.supplier);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch supplier');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    if (!id) return;
    try {
      setLedgerLoading(true);
      const response = await apiHelpers.getSupplierLedger(id!, { page: ledgerPage, limit: 20 });
      const data = response.data.data;
      setLedger(data.entries || []);
      setLedgerMeta({
        total: data.meta?.total || 0,
        totalPages: data.meta?.totalPages || 1,
        hasNext: data.meta?.hasNext || false,
        hasPrev: data.meta?.hasPrev || false,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this supplier?')) return;

    try {
      setDeleting(true);
      await apiHelpers.deleteSupplier(id);
      toast.success('Supplier deleted successfully');
      navigate('/suppliers');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddPayment = async (paymentData: any) => {
    try {
      await apiHelpers.addSupplierPayment(id!, paymentData);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchSupplier();
      fetchLedger();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Supplier not found</h3>
        <p className="text-gray-500 mt-1">The supplier you're looking for doesn't exist.</p>
        <Link to="/suppliers" className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-500">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/suppliers" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            <p className="text-gray-500">{supplier.contactPerson ? `Contact: ${supplier.contactPerson}` : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/suppliers/${supplier.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Record Payment
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

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {supplier.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {[
            { id: 'overview', label: 'Overview', icon: Truck },
            { id: 'ledger', label: 'Ledger', icon: DollarSign },
            { id: 'purchases', label: 'Purchases', icon: Package },
          ].map(tabItem => {
            const isActive = tab === tabItem.id;
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                onClick={() => setSearchParams({ tab: tabItem.id })}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tabItem.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Purchases</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(supplier.totalPurchases ?? 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(supplier.outstandingBalance ?? 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Opening Balance</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(supplier.openingBalance || 0)}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <p className="font-medium text-gray-900">{supplier.contactPerson || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{supplier.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{supplier.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">GSTIN</p>
                  <p className="font-medium text-gray-900 font-mono">{supplier.gstin || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">{supplier.address || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Purchases</h3>
              {supplier.purchases && supplier.purchases.length > 0 ? (
                <div className="space-y-3">
                  {supplier.purchases.slice(0, 5).map(purchase => (
                    <Link
                      key={purchase.id}
                      to={`/purchases/${purchase.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 font-mono">{purchase.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">{formatDate(purchase.purchaseDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(purchase.grandTotal)}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            purchase.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                            purchase.paymentStatus === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {purchase.paymentStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {supplier.purchases.length > 5 && (
                    <Link
                      to="/purchases"
                      className="block text-center text-primary-600 hover:text-primary-500 py-2"
                    >
                      View all {supplier.purchases.length} purchases →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No purchases found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="space-y-6">
          {/* Ledger Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Opening Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(supplier.openingBalance || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(ledger.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + l.amount, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(ledger.filter(l => l.type === 'CREDIT').reduce((sum, l) => sum + l.amount, 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" />
                      </td>
                    </tr>
                  ) : ledger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No ledger entries found
                      </td>
                    </tr>
                  ) : (
                    ledger.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{formatDate(entry.date)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.type === 'DEBIT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                          {entry.referenceNumber || entry.invoiceNumber || '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {entry.type === 'DEBIT' ? formatCurrency(entry.amount) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {entry.type === 'CREDIT' ? formatCurrency(entry.amount) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(entry.runningBalance)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{entry.description || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Pagination */}
            {ledgerMeta && ledgerMeta.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing page {ledgerPage} of {ledgerMeta.totalPages} ({ledgerMeta.total} total)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                    disabled={!ledgerMeta.hasPrev}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setLedgerPage(p => Math.min(ledgerMeta.totalPages, p + 1))}
                    disabled={!ledgerMeta.hasNext}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'purchases' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {supplier.purchases && supplier.purchases.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplier.purchases.map(purchase => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link to={`/purchases/${purchase.id}`} className="font-mono text-sm font-medium text-primary-600 hover:underline">
                            {purchase.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatDate(purchase.purchaseDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{purchase._count?.items || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.status === 'FINALIZED' ? 'bg-blue-100 text-blue-800' :
                            purchase.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                            purchase.paymentStatus === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {purchase.paymentStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(purchase.grandTotal)}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(purchase.balanceDue)}</td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/purchases/${purchase.id}`}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No purchases found</h3>
              <p className="text-gray-500 mt-1">This supplier has no purchase orders yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>
            <PaymentForm
              onClose={() => setShowPaymentModal(false)}
              onSubmit={handleAddPayment}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Form Component
function PaymentForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => Promise<void> }) {
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      setSubmitting(true);
      await onSubmit({
        method,
        amount: parseFloat(amount),
        reference,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Enter amount"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Transaction ID, Cheque #, etc."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Optional notes"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {submitting ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}

export default SupplierDetail;