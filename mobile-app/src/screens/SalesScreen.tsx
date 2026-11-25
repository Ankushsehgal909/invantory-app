import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Search, Filter, Plus, ChevronRight, Edit, Trash2, Download, ArrowDown, ArrowUp, Clock, CheckCircle, XCircle, DollarSign, ShoppingCart } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { formatCurrencyMajor as formatCurrency, formatDate } from '@shopstock/shared/utils';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: '#64748b', icon: Clock, label: 'Draft' },
  pending: { color: '#3b82f6', icon: Clock, label: 'Pending' },
  completed: { color: '#22c55e', icon: CheckCircle, label: 'Completed' },
  returned: { color: '#f59e0b', icon: ArrowUp, label: 'Returned' },
  cancelled: { color: '#ef4444', icon: XCircle, label: 'Cancelled' },
};

export function SalesScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => apiHelpers.getSales({ search: search || undefined, limit: 100 }),
    select: (response) => response.data.data,
  });

  const sales = response?.sales ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setDeletingId(null);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (sale: any) => {
    setEditingSale(sale);
    setDeletingId(sale.id);
    setModalVisible(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = statusConfig[item.status] || statusConfig.draft;
    const StatusIcon = status.icon;
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => navigation.navigate('SaleDetail', { sale: item })}
      >
        <View style={styles.saleLeft}>
          <View style={[styles.saleIcon, { backgroundColor: status.color + '20' }]}>
            <StatusIcon size={24} color={status.color} />
          </View>
          <View style={styles.saleInfo}>
            <View style={styles.saleHeader}>
              <Text style={styles.saleNumber}>{item.saleNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={styles.saleCustomer}>{item.customer?.name || 'Walk-in Customer'}</Text>
            <View style={styles.saleMeta}>
              <Text style={styles.saleDate}>{formatDate(item.saleDate)}</Text>
              <Text style={styles.saleItems}>{item.items?.length || 0} items</Text>
            </View>
          </View>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleTotal}>{formatCurrency(item.totalAmount)}</Text>
          <ChevronRight size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !sales.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sales</Text>
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.fab}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={Array(5)}
          renderItem={() => <View style={styles.skeletonCard} />}
          keyExtractor={(_, i) => `skeleton-${i}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Sales</Text>
          <Text style={styles.subtitle}>{sales.length} sales</Text>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.fab}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search sales..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Sale List */}
      <FlatList
        data={sales}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ShoppingCart size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No sales found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try adjusting your search' : 'Create your first sale to get started'}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => setShowModal(true)} style={styles.emptyAction}>
                <Plus size={20} color="#fff" />
                <Text style={styles.emptyActionText}>Create Sale</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add/Edit Sale Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSale ? 'Edit Sale' : 'Create Sale'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditingSale(null); }} style={styles.modalClose}>
                <ChevronRight size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <SaleForm
              sale={editingSale}
              onClose={() => { setShowModal(false); setEditingSale(null); }}
              onSubmit={(_data: any) => {
                // TODO: Implement create/update
                setShowModal(false);
                setEditingSale(null);
                queryClient.invalidateQueries({ queryKey: ['sales'] });
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <Trash2 size={48} color="#f59e0b" style={styles.confirmIcon} />
            <Text style={styles.confirmTitle}>Delete Sale</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete sale "{editingSale?.saleNumber}"? This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.confirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SaleForm({ sale, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    customerId: '',
    saleDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    paymentMethod: 'cash',
    notes: '',
    items: [{ productId: '', quantity: '1', unitPrice: '', discount: '0', taxRate: '0' }],
  });

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '1', unitPrice: '', discount: '0', taxRate: '0' }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  return (
    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.formSectionTitle}>Sale Details</Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Customer (optional)"
            value={formData.customerId}
            onChangeText={(v) => setFormData({ ...formData, customerId: v })}
            style={styles.input}
          />
          <TextInput
            placeholder="Date"
            value={formData.saleDate}
            onChangeText={(v) => setFormData({ ...formData, saleDate: v })}
            style={styles.input}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Payment Method"
            value={formData.paymentMethod}
            onChangeText={(v) => setFormData({ ...formData, paymentMethod: v })}
            style={styles.input}
          />
          <TextInput
            placeholder="Status"
            value={formData.status}
            onChangeText={(v) => setFormData({ ...formData, status: v })}
            style={styles.input}
          />
        </View>

        <TextInput
          placeholder="Notes"
          value={formData.notes}
          onChangeText={(v) => setFormData({ ...formData, notes: v })}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.formSectionTitle}>Items</Text>
        {formData.items.map((item: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInputWrapper}>
              <TextInput
                placeholder="Product"
                value={item.productId}
                onChangeText={(v) => updateItem(index, 'productId', v)}
                style={styles.itemInput}
              />
            </View>
            <View style={styles.itemInputWrapper}>
              <TextInput
                placeholder="Qty"
                value={item.quantity}
                onChangeText={(v) => updateItem(index, 'quantity', v)}
                style={styles.itemInputSmall}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.itemInputWrapper}>
              <TextInput
                placeholder="Unit Price"
                value={item.unitPrice}
                onChangeText={(v) => updateItem(index, 'unitPrice', v)}
                style={styles.itemInputSmall}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.itemInputWrapper}>
              <TextInput
                placeholder="Discount"
                value={item.discount}
                onChangeText={(v) => updateItem(index, 'discount', v)}
                style={styles.itemInputSmall}
                keyboardType="decimal-pad"
              />
            </View>
            {formData.items.length > 1 && (
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeButton}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
          <Plus size={20} color="#0ea5e9" />
          <Text style={styles.addItemText}>Add Item</Text>
        </TouchableOpacity>

        <View style={styles.formActions}>
          <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSubmit(formData)} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>{sale ? 'Update' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  headerLeft: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  fab: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: '#1e293b' },
  filterButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  saleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  saleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  saleIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saleInfo: { flex: 1, minWidth: 0 },
  saleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saleNumber: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  saleCustomer: { fontSize: 14, color: '#475569', marginTop: 2 },
  saleMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  saleDate: { fontSize: 12, color: '#94a3b8' },
  saleItems: { fontSize: 12, color: '#94a3b8' },
  saleRight: { alignItems: 'flex-end', minWidth: 100 },
  saleTotal: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40 },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: '#0ea5e9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyActionText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  skeletonCard: { height: 80, backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  modalClose: { padding: 4 },
  formScroll: { flex: 1 },
  form: { padding: 20, gap: 20 },
  formSectionTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8, paddingTop: 8 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, height: 48, paddingHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, fontSize: 16, color: '#1e293b' },
  textArea: { height: 80, paddingTop: 12 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  itemInputWrapper: { flex: 1 },
  itemInput: { height: 48, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b' },
  itemInputSmall: { height: 48, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', width: 80 },
  removeButton: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  addItemButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#f0f9ff', borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd', alignSelf: 'flex-start' },
  addItemText: { fontSize: 14, fontWeight: '500', color: '#0ea5e9' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnSecondary: { flex: 1, height: 48, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  btnPrimary: { flex: 1, height: 48, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' },
  confirmIcon: { marginBottom: 16 },
  confirmTitle: { fontSize: 20, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: { flex: 1, height: 48, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  confirmDelete: { flex: 1, height: 48, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});