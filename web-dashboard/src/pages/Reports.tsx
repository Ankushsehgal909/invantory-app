import { useEffect, useState } from 'react';
import { api, apiHelpers } from '../services/api';
import { formatCurrency, formatDate } from '@shopstock/shared/utils';
import {
  Download,
  Loader2,
  BarChart2,
  DollarSign,
  Package,
  Truck,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SalesReport {
  period: string;
  totalSales: number;
  totalInvoices: number;
  averageOrderValue: number;
  topProducts: Array<{ productId: string; name: string; sku: string; quantity: number; revenue: number }>;
  topCustomers: Array<{ customerId: string; name: string; totalPurchases: number; invoiceCount: number }>;
  dailySales: Array<{ date: string; total: number; count: number }>;
}

interface PurchaseReport {
  period: string;
  totalPurchases: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ productId: string; name: string; sku: string; quantity: number; cost: number }>;
  topSuppliers: Array<{ supplierId: string; name: string; totalPurchases: number; orderCount: number }>;
  dailyPurchases: Array<{ date: string; total: number; count: number }>;
}

interface StockReport {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
    unit: string;
    purchaseCost: number;
    sellingPrice: number;
    stockValue: number;
    status: string;
    expiryDate?: string;
  }>;
}

interface LedgerReport {
  customerOutstanding: Array<{ customerId: string; name: string; balance: number; creditLimit: number }>;
  supplierOutstanding: Array<{ supplierId: string; name: string; balance: number; creditLimit: number }>;
  totalReceivables: number;
  totalPayables: number;
}

type ReportType = 'sales' | 'purchases' | 'stock' | 'ledger';

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);

  // Sales Report Data
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  // Purchase Report Data
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReport | null>(null);
  // Stock Report Data
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  // Ledger Report Data
  const [ledgerReport, setLedgerReport] = useState<LedgerReport | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportType, dateRange.start, dateRange.end]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      if (reportType === 'sales') {
        const response = await apiHelpers.getSalesReport(params);
        setSalesReport(response.data.data.report);
      } else if (reportType === 'purchases') {
        const response = await apiHelpers.getPurchaseReport(params);
        setPurchaseReport(response.data.data.report);
      } else if (reportType === 'stock') {
        const response = await apiHelpers.getStockReport(params);
        setStockReport(response.data.data.report);
      } else if (reportType === 'ledger') {
        const response = await apiHelpers.getLedgerReport(params);
        setLedgerReport(response.data.data.report);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      params.type = reportType;

      // Note: exportReport is not in apiHelpers, using direct api call
      const response = await api.get('/import-export/export/reports', { params, responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export completed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  };

  const reportTabs: Array<{ id: ReportType; label: string; icon: any }> = [
    { id: 'sales', label: 'Sales Report', icon: DollarSign },
    { id: 'purchases', label: 'Purchase Report', icon: Truck },
    { id: 'stock', label: 'Stock Report', icon: Package },
    { id: 'ledger', label: 'Ledger Report', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">View business insights and analytics</p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          {reportTabs.map(tab => {
            const isActive = reportType === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date Range Filter */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setDateRange({
                start: firstDay.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
              });
            }}
            className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
              setDateRange({
                start: firstDay.toISOString().split('T')[0],
                end: lastDay.toISOString().split('T')[0],
              });
            }}
            className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50"
          >
            Last Month
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            {reportType === 'sales' && salesReport && <SalesReportView report={salesReport} />}
            {reportType === 'purchases' && purchaseReport && <PurchaseReportView report={purchaseReport} />}
            {reportType === 'stock' && stockReport && <StockReportView report={stockReport} />}
            {reportType === 'ledger' && ledgerReport && <LedgerReportView report={ledgerReport} />}
            {!salesReport && !purchaseReport && !stockReport && !ledgerReport && !loading && (
              <div className="text-center py-16">
                <BarChart2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No data available</h3>
                <p className="text-gray-500 mt-1">Select a date range to view reports.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Sales Report View
function SalesReportView({ report }: { report: SalesReport }) {
  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.totalSales)}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900">{report.totalInvoices}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.averageOrderValue)}</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary-500" />
          Top Selling Products
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Sold</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topProducts.slice(0, 10).map((product, index) => (
                <tr key={product.productId} className="hover:bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{product.quantity}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary-500" />
          Top Customers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchases</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topCustomers.slice(0, 10).map((customer, index) => (
                <tr key={customer.customerId} className="hover:bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(customer.totalPurchases)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{customer.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Sales Trend */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-500" />
          Daily Sales Trend
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.dailySales.slice(-30).reverse().map(day => (
                <tr key={day.date} className="hover:bg-white">
                  <td className="px-6 py-4 text-sm text-gray-900">{formatDate(day.date)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(day.total)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{day.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Purchase Report View
function PurchaseReportView({ report }: { report: PurchaseReport }) {
  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Total Purchases</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.totalPurchases)}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{report.totalOrders}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(report.averageOrderValue)}</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary-500" />
          Top Purchased Products
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Purchased</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topProducts.slice(0, 10).map((product, index) => (
                <tr key={product.productId} className="hover:bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{product.quantity}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(product.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Suppliers */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary-500" />
          Top Suppliers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchases</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topSuppliers.slice(0, 10).map((supplier, index) => (
                <tr key={supplier.supplierId} className="hover:bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                      <p className="font-medium text-gray-900">{supplier.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(supplier.totalPurchases)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{supplier.orderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Stock Report View
function StockReportView({ report }: { report: StockReport }) {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800',
      DISCONTINUED: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{report.totalProducts}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Total Stock Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.totalValue)}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
          <p className="text-sm text-yellow-700">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-700">{report.lowStockCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
          <p className="text-sm text-red-700">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700">{report.outOfStockCount}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
          <p className="text-sm text-orange-700">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-700">{report.expiringSoonCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
          <p className="text-sm text-red-700">Expired</p>
          <p className="text-2xl font-bold text-red-700">{report.expiredCount}</p>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary-500" />
          Stock Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.items.map(item => (
                <tr key={item.id} className="hover:bg-white">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.sku}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {item.reorderLevel} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {formatCurrency(item.purchaseCost)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.stockValue)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.expiryDate ? formatDate(item.expiryDate) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Ledger Report View
function LedgerReportView({ report }: { report: LedgerReport }) {
  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
          <p className="text-sm text-green-700">Total Receivables</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(report.totalReceivables)}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
          <p className="text-sm text-red-700">Total Payables</p>
          <p className="text-3xl font-bold text-red-700">{formatCurrency(report.totalPayables)}</p>
        </div>
      </div>

      {/* Customer Outstanding */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary-500" />
          Customer Outstanding (Receivables)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.customerOutstanding.map(customer => (
                <tr key={customer.customerId} className="hover:bg-white">
                  <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(customer.balance)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(customer.creditLimit)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(customer.creditLimit - customer.balance)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.balance > customer.creditLimit ? 'bg-red-100 text-red-800' :
                      customer.balance > customer.creditLimit * 0.8 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {customer.balance > customer.creditLimit ? 'Over Limit' :
                       customer.balance > customer.creditLimit * 0.8 ? 'Near Limit' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Outstanding */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary-500" />
          Supplier Outstanding (Payables)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.supplierOutstanding.map(supplier => (
                <tr key={supplier.supplierId} className="hover:bg-white">
                  <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(supplier.balance)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(supplier.creditLimit)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(supplier.creditLimit - supplier.balance)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      supplier.balance > supplier.creditLimit ? 'bg-red-100 text-red-800' :
                      supplier.balance > supplier.creditLimit * 0.8 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {supplier.balance > supplier.creditLimit ? 'Over Limit' :
                       supplier.balance > supplier.creditLimit * 0.8 ? 'Near Limit' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;