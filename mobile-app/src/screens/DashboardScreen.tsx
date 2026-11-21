import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Package, DollarSign, TrendingUp, ShoppingCart, Truck, AlertTriangle, Users, Plus, Download, Upload } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { formatCurrencyMajor as formatCurrency } from '@shopstock/shared/utils';

const statCards = [
  { name: 'Total Products', icon: Package, color: '#3b82f6', key: 'totalProducts' },
  { name: 'Stock Value (Cost)', icon: DollarSign, color: '#22c55e', key: 'stockValueAtCost', isCurrency: true },
  { name: 'Stock Value (Sale)', icon: TrendingUp, color: '#a855f7', key: 'stockValueAtSale', isCurrency: true },
  { name: 'Total Stock Units', icon: Package, color: '#f97316', key: 'totalStockUnits' },
  { name: "Today's Sales", icon: ShoppingCart, color: '#6366f1', key: 'todaySales', isCurrency: true },
  { name: "Today's Purchases", icon: Truck, color: '#ec4899', key: 'todayPurchases', isCurrency: true },
  { name: 'Low Stock', icon: AlertTriangle, color: '#f59e0b', key: 'lowStockCount' },
  { name: 'Out of Stock', icon: AlertTriangle, color: '#ef4444', key: 'outOfStockCount' },
];

export function DashboardScreen({ navigation }: any) {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary', period],
    queryFn: () => apiHelpers.getDashboardSummary(period),
    select: (response) => response.data.data.summary,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !summary) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={statsGridStyles.container}>
            {statCards.map((stat) => (
              <View key={stat.key} style={statsGridStyles.card}>
                <View style={statsGridStyles.cardSkeleton} />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Overview of your shop</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Products', { new: true })}
              style={styles.fab}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', '7d', '30d'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
            >
              <Text style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}>
                {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={statsGridStyles.container}>
          {statCards.map((stat) => {
            const value = summary?.[stat.key as keyof typeof summary] ?? 0;
            const displayValue = stat.isCurrency ? formatCurrency(value) : value.toLocaleString();
            return (
              <View key={stat.key} style={statsGridStyles.card}>
                <View style={statsGridStyles.cardHeader}>
                  <View style={[statsGridStyles.iconContainer, { backgroundColor: stat.color + '20' }]}>
                    <stat.icon size={24} color={stat.color} />
                  </View>
                </View>
                <Text style={statsGridStyles.value}>{displayValue}</Text>
                <Text style={statsGridStyles.label}>{stat.name}</Text>
              </View>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Products', { new: true })}
              style={[styles.actionCard, { borderColor: '#0ea5e9' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#0ea5e920' }]}>
                <Plus size={24} color="#0ea5e9" />
              </View>
              <Text style={styles.actionLabel}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Purchases', { new: true })}
              style={[styles.actionCard, { borderColor: '#22c55e' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#22c55e20' }]}>
                <Download size={24} color="#22c55e" />
              </View>
              <Text style={styles.actionLabel}>Record Purchase</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Sales', { new: true })}
              style={[styles.actionCard, { borderColor: '#6366f1' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#6366f120' }]}>
                <ShoppingCart size={24} color="#6366f1" />
              </View>
              <Text style={styles.actionLabel}>Create Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Customers')}
              style={[styles.actionCard, { borderColor: '#a855f7' }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#a855f720' }]}>
                <Users size={24} color="#a855f7" />
              </View>
              <Text style={styles.actionLabel}>Customers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alerts Summary */}
        <View style={styles.section}>
          <View style={styles.alertsHeader}>
            <Text style={styles.sectionTitle}>Alerts</Text>
          </View>
          <View style={styles.alertsGrid}>
            <View style={[styles.alertCard, { borderLeftColor: '#f59e0b' }]}>
              <Text style={styles.alertCount}>{summary?.lowStockCount ?? 0}</Text>
              <Text style={styles.alertLabel}>Low Stock Items</Text>
            </View>
            <View style={[styles.alertCard, { borderLeftColor: '#ef4444' }]}>
              <Text style={styles.alertCount}>{summary?.outOfStockCount ?? 0}</Text>
              <Text style={styles.alertLabel}>Out of Stock</Text>
            </View>
            <View style={[styles.alertCard, { borderLeftColor: '#f97316' }]}>
              <Text style={styles.alertCount}>{summary?.expiringSoonCount ?? 0}</Text>
              <Text style={styles.alertLabel}>Expiring Soon</Text>
            </View>
            <View style={[styles.alertCard, { borderLeftColor: '#64748b' }]}>
              <Text style={styles.alertCount}>{summary?.expiredCount ?? 0}</Text>
              <Text style={styles.alertLabel}>Expired</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.financialGrid}>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Receivables</Text>
              <Text style={[styles.financialValue, { color: '#22c55e' }]}>
                {formatCurrency(summary?.totalReceivables ?? 0)}
              </Text>
            </View>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Payables</Text>
              <Text style={[styles.financialValue, { color: '#ef4444' }]}>
                {formatCurrency(summary?.totalPayables ?? 0)}
              </Text>
            </View>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Overdue</Text>
              <Text style={[styles.financialValue, { color: '#f59e0b' }]}>
                {formatCurrency(summary?.totalOverdueReceivables ?? 0)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {},
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
});

const statsGridStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardSkeleton: {
    height: 80,
  },
  cardHeader: {
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  alertCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 4,
  },
  alertCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  alertLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  financialCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  financialLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});