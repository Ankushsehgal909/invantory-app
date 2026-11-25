import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { useQuery } from '@tanstack/react-query';
import { FileText, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users, Truck, Clock, AlertTriangle, Download, Calendar, Filter } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { formatCurrencyMajor as formatCurrency, formatDate } from '@shopstock/shared/utils';

const reportTypes = [
  { id: 'sales', name: 'Sales Report', icon: ShoppingCart, color: '#6366f1', description: 'View sales performance and trends' },
  { id: 'purchases', name: 'Purchase Report', icon: Truck, color: '#22c55e', description: 'Track purchase history and costs' },
  { id: 'stock', name: 'Stock Report', icon: Package, color: '#3b82f6', description: 'Current inventory levels and valuation' },
  { id: 'profit-loss', name: 'Profit & Loss', icon: TrendingUp, color: '#a855f7', description: 'Profitability analysis' },
  { id: 'receivables', name: 'Receivables', icon: DollarSign, color: '#ec4899', description: 'Customer outstanding balances' },
  { id: 'payables', name: 'Payables', icon: DollarSign, color: '#f59e0b', description: 'Supplier outstanding balances' },
  { id: 'expiry', name: 'Expiry Report', icon: AlertTriangle, color: '#ef4444', description: 'Products expiring soon' },
  { id: 'low-stock', name: 'Low Stock Alert', icon: AlertTriangle, color: '#f97316', description: 'Items below reorder level' },
];

const periodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function ReportsScreen({ navigation }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [refreshing, setRefreshing] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary', selectedPeriod],
    queryFn: () => apiHelpers.getDashboardSummary(selectedPeriod),
    select: (response) => response.data.data.summary,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    setShowPeriodModal(false);
    if (period === 'custom') {
      // TODO: Show date picker for custom range
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>Business insights and analytics</Text>
          </View>
          <TouchableOpacity onPress={() => setShowPeriodModal(true)} style={styles.periodButton}>
            <Calendar size={20} color="#0ea5e9" />
            <Text style={styles.periodButtonText}>{periodOptions.find(p => p.value === selectedPeriod)?.label || selectedPeriod}</Text>
            <Filter size={16} color="#0ea5e9" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#6366f120' }]}>
                <ShoppingCart size={24} color="#6366f1" />
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(summary?.todaySales || 0)}</Text>
              <Text style={styles.summaryLabel}>Today's Sales</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#22c55e20' }]}>
                <Truck size={24} color="#22c55e" />
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(summary?.todayPurchases || 0)}</Text>
              <Text style={styles.summaryLabel}>Today's Purchases</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#a855f720' }]}>
                <TrendingUp size={24} color="#a855f7" />
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(summary?.stockValueAtSale || 0)}</Text>
              <Text style={styles.summaryLabel}>Stock Value (Sale)</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#0ea5e920' }]}>
                <Package size={24} color="#0ea5e9" />
              </View>
              <Text style={styles.summaryValue}>{summary?.totalProducts || 0}</Text>
              <Text style={styles.summaryLabel}>Total Products</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.financialGrid}>
            <View style={styles.financialCard}>
              <View style={styles.financialIcon}>
                <DollarSign size={24} color="#22c55e" />
              </View>
              <Text style={styles.financialLabel}>Receivables</Text>
              <Text style={[styles.financialValue, { color: '#22c55e' }]}>
                {formatCurrency(summary?.totalReceivables || 0)}
              </Text>
              <Text style={styles.financialSubLabel}>From {summary?.overdueReceivablesCount || 0} customers</Text>
            </View>
            <View style={styles.financialCard}>
              <View style={styles.financialIcon}>
                <DollarSign size={24} color="#ef4444" />
              </View>
              <Text style={styles.financialLabel}>Payables</Text>
              <Text style={[styles.financialValue, { color: '#ef4444' }]}>
                {formatCurrency(summary?.totalPayables || 0)}
              </Text>
              <Text style={styles.financialSubLabel}>To {summary?.overduePayablesCount || 0} suppliers</Text>
            </View>
            <View style={styles.financialCard}>
              <View style={styles.financialIcon}>
                <Clock size={24} color="#f59e0b" />
              </View>
              <Text style={styles.financialLabel}>Overdue</Text>
              <Text style={[styles.financialValue, { color: '#f59e0b' }]}>
                {formatCurrency(summary?.totalOverdueReceivables || 0)}
              </Text>
              <Text style={styles.financialSubLabel}>Overdue receivables</Text>
            </View>
          </View>
        </View>

        {/* Stock Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Alerts</Text>
          <View style={styles.alertsGrid}>
            <View style={[styles.alertCard, { borderLeftColor: '#f59e0b' }]}>
              <View style={styles.alertIcon}>
                <AlertTriangle size={24} color="#f59e0b" />
              </View>
              <Text style={styles.alertCount}>{summary?.lowStockCount || 0}</Text>
              <Text style={styles.alertLabel}>Low Stock Items</Text>
            </View>
            <View style={[styles.alertCard, { borderLeftColor: '#ef4444' }]}>
              <View style={styles.alertIcon}>
                <AlertTriangle size={24} color="#ef4444" />
              </View>
              <Text style={styles.alertCount}>{summary?.outOfStockCount || 0}</Text>
              <Text style={styles.alertLabel}>Out of Stock</Text>
            </View>
            <View style={[styles.alertCard, { borderLeftColor: '#f97316' }]}>
              <View style={styles.alertIcon}>
                <Clock size={24} color="#f97316" />
              </View>
              <Text style={styles.alertCount}>{summary?.expiringSoonCount || 0}</Text>
              <Text style={styles.alertLabel}>Expiring Soon</Text>
            </View>
            <View style={[styles.alertCard, { borderLeftColor: '#64748b' }]}>
              <View style={styles.alertIcon}>
                <AlertTriangle size={24} color="#64748b" />
              </View>
              <Text style={styles.alertCount}>{summary?.expiredCount || 0}</Text>
              <Text style={styles.alertLabel}>Expired</Text>
            </View>
          </View>
        </View>

        {/* Report Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports</Text>
          <View style={styles.reportsGrid}>
            {reportTypes.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                onPress={() => {
                  // TODO: Navigate to specific report
                }}
              >
                <View style={[styles.reportIcon, { backgroundColor: report.color + '20' }]}>
                  <report.icon size={24} color={report.color} />
                </View>
                <Text style={styles.reportName}>{report.name}</Text>
                <Text style={styles.reportDescription}>{report.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { borderColor: '#6366f1' }]}>
              <View style={[styles.actionIcon, { backgroundColor: '#6366f120' }]}>
                <Download size={24} color="#6366f1" />
              </View>
              <Text style={styles.actionLabel}>Export Sales Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { borderColor: '#22c55e' }]}>
              <View style={[styles.actionIcon, { backgroundColor: '#22c55e20' }]}>
                <Download size={24} color="#22c55e" />
              </View>
              <Text style={styles.actionLabel}>Export Purchase Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { borderColor: '#0ea5e9' }]}>
              <View style={[styles.actionIcon, { backgroundColor: '#0ea5e920' }]}>
                <Download size={24} color="#0ea5e9" />
              </View>
              <Text style={styles.actionLabel}>Export Stock Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { borderColor: '#a855f7' }]}>
              <View style={[styles.actionIcon, { backgroundColor: '#a855f720' }]}>
                <FileText size={24} color="#a855f7" />
              </View>
              <Text style={styles.actionLabel}>Generate P&L Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Period Selection Modal */}
      <Modal visible={showPeriodModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)} style={styles.modalClose}>
                <Filter size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {periodOptions.map((period) => (
                <TouchableOpacity
                  key={period.value}
                  onPress={() => handlePeriodSelect(period.value)}
                  style={[
                    styles.periodOption,
                    selectedPeriod === period.value && styles.periodOptionActive,
                  ]}
                >
                  <Text style={[
                    styles.periodOptionText,
                    selectedPeriod === period.value && styles.periodOptionTextActive,
                  ]}>
                    {period.label}
                  </Text>
                  {selectedPeriod === period.value && (
                    <View style={styles.periodOptionCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  headerLeft: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  periodButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  periodButtonText: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  summarySection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16, paddingHorizontal: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  summaryCard: { flex: 1, minWidth: '45%', padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  summaryIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  financialGrid: { flexDirection: 'row', gap: 12 },
  financialCard: { flex: 1, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  financialIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  financialLabel: { fontSize: 13, color: '#64748b', marginBottom: 4, textAlign: 'center' },
  financialValue: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  financialSubLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  alertsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  alertCard: { flex: 1, minWidth: '45%', padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: 4, alignItems: 'center' },
  alertIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  alertCount: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  alertLabel: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  reportsGrid: { gap: 12 },
  reportCard: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  reportIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  reportName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  reportDescription: { fontSize: 13, color: '#64748b' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, minWidth: '45%', padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  actionIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '500', color: '#1e293b', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  modalClose: { padding: 4 },
  modalContent: { padding: 8 },
  periodOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  periodOptionActive: { backgroundColor: '#f0f9ff' },
  periodOptionText: { fontSize: 16, color: '#1e293b' },
  periodOptionTextActive: { color: '#0ea5e9', fontWeight: '600' },
  periodOptionCheck: { position: 'absolute', right: 16, top: '50%', marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
});