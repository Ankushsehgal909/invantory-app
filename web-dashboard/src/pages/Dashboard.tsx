import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  AlertCircle,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  ArrowDownLeft,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { formatCurrency } from '@shopstock/shared/utils';
import { apiHelpers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/ui/stat-card';
import { Tabs } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { cn } from '../utils/cn';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');

  const { data: summary, refetch, isFetching } = useQuery({
    queryKey: ['dashboardSummary', period],
    queryFn: () => apiHelpers.getDashboardSummary(period),
    select: (response) => response.data.data.summary,
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recentTransactions', period],
    queryFn: () =>
      apiHelpers.getStockMovements({
        startDate: period === 'today' ? new Date().toISOString().split('T')[0] : undefined,
        limit: 8,
      }),
    select: (response) => response.data.data.movements,
  });

  useEffect(() => {
    refetch();
  }, [period, refetch]);

  // Calculations for Stock Health Bar
  const totalStock = summary?.totalProducts ?? 0;
  const lowStock = summary?.lowStockCount ?? 0;
  const outOfStock = summary?.outOfStockCount ?? 0;
  const healthyStock = Math.max(0, totalStock - lowStock - outOfStock);
  const healthyPercent = totalStock > 0 ? Math.round((healthyStock / totalStock) * 100) : 100;
  const lowPercent = totalStock > 0 ? Math.round((lowStock / totalStock) * 100) : 0;
  const outPercent = totalStock > 0 ? Math.round((outOfStock / totalStock) * 100) : 0;

  const quickActions = [
    {
      title: 'New Sale / POS',
      desc: 'Create invoice and checkout customer',
      href: '/sales?new=true',
      icon: ShoppingCart,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white',
    },
    {
      title: 'Add New Product',
      desc: 'Add SKU, barcode, price and stock',
      href: '/products?new=true',
      icon: Package,
      color: 'bg-primary-500/10 text-primary-600 border-primary-500/20 group-hover:bg-primary-600 group-hover:text-white',
    },
    {
      title: 'Record Restock / Purchase',
      desc: 'Log incoming stock from vendor',
      href: '/purchases?new=true',
      icon: ArrowDownLeft,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white',
    },
    {
      title: 'Stock Adjustment',
      desc: 'Reconcile damage, losses or manual count',
      href: '/stock/adjustments?new=true',
      icon: SlidersHorizontal,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white',
    },
  ];

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-7">
      {/* Top Welcome & Period Filter Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.name?.split(' ')[0] || 'Store Admin'} 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>{currentDateFormatted}</span>
            <span>•</span>
            <span>Overview of your business & stock performance</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Tabs
            size="sm"
            value={period}
            onChange={(val) => setPeriod(val as any)}
            options={[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
            ]}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')} />
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/sales?new=true')}
            className="h-8 gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Sale</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Bento (21st.dev Card Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(summary?.todaySales ?? 0)}
          icon={ShoppingCart}
          accentColor="indigo"
          trend={{ value: '+14.2%', isPositive: true, period: 'vs previous' }}
          description="Total gross retail revenue"
          badge="Live"
          badgeVariant="success"
        />

        <StatCard
          title="Stock Value (Sale)"
          value={formatCurrency(summary?.stockValueAtSale ?? 0)}
          icon={TrendingUp}
          accentColor="purple"
          trend={{ value: '+8.5%', isPositive: true, period: 'projected profit' }}
          description="Estimated market value"
        />

        <StatCard
          title="Inventory Cost"
          value={formatCurrency(summary?.stockValueAtCost ?? 0)}
          icon={DollarSign}
          accentColor="emerald"
          description="Total capital locked in inventory"
        />

        <StatCard
          title="Total Stock Units"
          value={(summary?.totalStockUnits ?? 0).toLocaleString()}
          icon={Package}
          accentColor="sky"
          subtitle={`${summary?.totalProducts ?? 0} distinct SKUs`}
          badge={`${summary?.totalProducts ?? 0} SKUs`}
          badgeVariant="info"
        />
      </div>

      {/* Secondary Operational & Alert Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Low Stock Alert"
          value={summary?.lowStockCount ?? 0}
          icon={AlertTriangle}
          accentColor="amber"
          badge={summary?.lowStockCount ? 'Action needed' : 'All good'}
          badgeVariant={summary?.lowStockCount ? 'warning' : 'default'}
          description="Products below reorder threshold"
          onClick={() => navigate('/products?filter=low_stock')}
        />

        <StatCard
          title="Out of Stock"
          value={summary?.outOfStockCount ?? 0}
          icon={AlertCircle}
          accentColor="rose"
          badge={summary?.outOfStockCount ? 'Critical' : 'None'}
          badgeVariant={summary?.outOfStockCount ? 'destructive' : 'default'}
          description="Items with 0 available quantity"
          onClick={() => navigate('/products?filter=out_of_stock')}
        />

        <StatCard
          title="Expiring Soon"
          value={summary?.expiringSoonCount ?? 0}
          icon={Clock}
          accentColor="amber"
          badge="Next 30 Days"
          badgeVariant="warning"
          description="Batches expiring within a month"
          onClick={() => navigate('/products?tab=batches')}
        />

        <StatCard
          title="Net Balance"
          value={formatCurrency((summary?.totalReceivables ?? 0) - (summary?.totalPayables ?? 0))}
          icon={Users}
          accentColor="teal"
          description={`Receivables: ${formatCurrency(summary?.totalReceivables ?? 0)}`}
        />
      </div>

      {/* Inventory Health & Quick Actions Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Stock Health Bar (21st.dev Component) */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Inventory Health</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {totalStock} Total SKUs
              </Badge>
            </div>
            <CardDescription>
              Breakdown of stock availability & reorder status
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Visual Multi-segment Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex shadow-inner">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${healthyPercent}%` }}
                  title={`Healthy: ${healthyPercent}%`}
                />
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${lowPercent}%` }}
                  title={`Low Stock: ${lowPercent}%`}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${outPercent}%` }}
                  title={`Out of Stock: ${outPercent}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>0%</span>
                <span className="font-medium text-foreground">{healthyPercent}% in healthy condition</span>
                <span>100%</span>
              </div>
            </div>

            {/* Legend with Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] font-semibold text-emerald-700 block">Healthy</span>
                <span className="text-base font-bold text-foreground">{healthyStock}</span>
              </div>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] font-semibold text-amber-700 block">Low Stock</span>
                <span className="text-base font-bold text-foreground">{lowStock}</span>
              </div>

              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[11px] font-semibold text-rose-700 block">Out</span>
                <span className="text-base font-bold text-foreground">{outOfStock}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5 mt-2"
              onClick={() => navigate('/products')}
            >
              <span>Manage Inventory Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions Bento Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Quick Operations</span>
              </CardTitle>
              <span className="text-xs text-muted-foreground">Shortcuts to common tasks</span>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => navigate(action.href)}
                    className="group relative flex items-start gap-3.5 p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-primary-500/40 text-left transition-all duration-200 shadow-subtle hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
                        action.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {action.desc}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground/60 absolute right-3.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements Activity Table (shadcn Data Table Style) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Recent Stock Activity</CardTitle>
            <CardDescription>
              Latest incoming restocks, sales, and inventory changes
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="text-xs text-primary gap-1"
          >
            <span>View All Activity</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="table-container border-0 rounded-none border-t border-border/60">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Product</th>
                  <th className="text-right">Qty Change</th>
                  <th className="text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="font-medium text-foreground">No recent stock movements</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        New sales or purchase orders will automatically appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  recentTransactions?.slice(0, 8).map((tx: any) => {
                    const isSale = tx.movementType?.includes('SALE');
                    const isPurchase = tx.movementType?.includes('PURCHASE');
                    const isAdjustment = tx.movementType?.includes('ADJUSTMENT');

                    return (
                      <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                        <td>
                          <Badge
                            variant={isSale ? 'success' : isPurchase ? 'info' : isAdjustment ? 'warning' : 'secondary'}
                            className="text-[11px]"
                          >
                            {tx.movementType}
                          </Badge>
                        </td>
                        <td className="font-mono text-xs text-muted-foreground font-medium">
                          {tx.referenceId ? tx.referenceId.slice(0, 10) : '—'}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold">
                              {tx.product?.name ? tx.product.name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <span className="font-medium text-foreground">{tx.product?.name || 'Item'}</span>
                          </div>
                        </td>
                        <td className="text-right font-medium">
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold',
                              tx.quantityDelta > 0
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-rose-500/10 text-rose-600'
                            )}
                          >
                            {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}
                          </span>
                        </td>
                        <td className="text-right text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
