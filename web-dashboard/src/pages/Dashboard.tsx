import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, AlertTriangle, Package, ShoppingCart, Users, DollarSign, AlertCircle, Clock, Plus } from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency } from '@shopstock/shared/utils';
import { apiHelpers } from '../services/api';

const statCards = [
  { name: 'Total Products', icon: Package, color: 'bg-blue-500', key: 'totalProducts' },
  { name: 'Stock Value (Cost)', icon: DollarSign, color: 'bg-green-500', key: 'stockValueAtCost', isCurrency: true },
  { name: 'Stock Value (Sale)', icon: TrendingUp, color: 'bg-purple-500', key: 'stockValueAtSale', isCurrency: true },
  { name: 'Total Stock Units', icon: Package, color: 'bg-orange-500', key: 'totalStockUnits' },
  { name: 'Today\'s Sales', icon: ShoppingCart, color: 'bg-indigo-500', key: 'todaySales', isCurrency: true },
  { name: 'Today\'s Purchases', icon: TrendingDown, color: 'bg-pink-500', key: 'todayPurchases', isCurrency: true },
  { name: 'Low Stock', icon: AlertTriangle, color: 'bg-yellow-500', key: 'lowStockCount' },
  { name: 'Out of Stock', icon: AlertCircle, color: 'bg-red-500', key: 'outOfStockCount' },
  { name: 'Expiring Soon', icon: Clock, color: 'bg-amber-500', key: 'expiringSoonCount' },
  { name: 'Expired', icon: AlertCircle, color: 'bg-gray-500', key: 'expiredCount' },
  { name: 'Receivables', icon: Users, color: 'bg-teal-500', key: 'totalReceivables', isCurrency: true },
  { name: 'Payables', icon: DollarSign, color: 'bg-rose-500', key: 'totalPayables', isCurrency: true },
];

export function Dashboard() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary', period],
    queryFn: () => apiHelpers.getDashboardSummary(period),
    select: (response) => response.data.data.summary,
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recentTransactions', period],
    queryFn: () => apiHelpers.getStockMovements({ startDate: period === 'today' ? new Date().toISOString().split('T')[0] : undefined, limit: 5 }),
    select: (response) => response.data.data.movements,
  });

  useEffect(() => {
    refetch();
  }, [period, refetch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your shop performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const value = summary?.[stat.key as keyof typeof summary] ?? 0;
          const displayValue = stat.isCurrency ? formatCurrency(value) : value.toLocaleString();
          return (
            <div key={stat.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{displayValue}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <a href="/products?new=true" className="flex items-center gap-3 p-3 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Product</span>
            </a>
            <a href="/purchases?new=true" className="flex items-center gap-3 p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Record Purchase</span>
            </a>
            <a href="/sales?new=true" className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Sale</span>
            </a>
            <a href="/stock/adjustments?new=true" className="flex items-center gap-3 p-3 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Stock Adjustment</span>
            </a>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <a href="/stock/movements" className="text-sm text-primary-500 hover:text-primary-600">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Qty</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No recent activity</td>
                  </tr>
                ) : (
                  recentTransactions?.slice(0, 10).map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          tx.movementType?.includes('SALE') ? 'bg-green-100 text-green-700' :
                          tx.movementType?.includes('PURCHASE') ? 'bg-blue-100 text-blue-700' :
                          tx.movementType?.includes('ADJUSTMENT') ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.movementType}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-medium text-gray-900">{tx.referenceId?.slice(0, 12)}...</td>
                      <td className="py-3 text-sm text-gray-600">{tx.product?.name || 'N/A'}</td>
                      <td className="py-3 text-sm text-gray-600">{tx.quantityDelta > 0 ? '+' : ''}{tx.quantityDelta}</td>
                      <td className="py-3 text-sm text-gray-500">{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}