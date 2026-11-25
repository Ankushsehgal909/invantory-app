import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Filter, Plus, ChevronRight, Edit, Trash2, Phone, Mail, MapPin, DollarSign, AlertTriangle, Clock } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { formatCurrencyMajor as formatCurrency, formatDate } from '@shopstock/shared/utils';

export function CustomersScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => apiHelpers.getCustomers({ search: search || undefined, limit: 100 }),
    select: (response) => response.data.data,
  });

  const customers = response?.customers ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.deleteProduct(id), // TODO: fix endpoint
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setDeletingId(null);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (customer: any) => {
    setEditingCustomer(customer);
    setDeletingId(customer.id);
    setModalVisible(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => navigation.navigate('CustomerDetail', { customer: item })}
    >
      <View style={styles.customerLeft}>
        <View style={[styles.customerAvatar, { backgroundColor: '#e0e7ff' }]}>
          <Users size={24} color="#3730a3" />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerPhone}>{item.phone}</Text>
          <View style={styles.customerMeta}>
            {item.email && (
              <View style={styles.metaItem}>
                <Mail size={12} color="#94a3b8" />
                <Text style={styles.metaText}>{item.email}</Text>
              </View>
            )}
            {item.city && (
              <View style={styles.metaItem}>
                <MapPin size={12} color="#94a3b8" />
                <Text style={styles.metaText}>{item.city}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.customerRight}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={[
            styles.balanceValue,
            (item.balance || 0) > 0 ? styles.balanceReceivable : styles.balancePayable,
          ]}>
            {formatCurrency(Math.abs(item.balance || 0))}
            {(item.balance || 0) > 0 ? ' Dr' : ' Cr'}
          </Text>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !customers.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Customers</Text>
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
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>{customers.length} customers</Text>
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
            placeholder="Search customers..."
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

      {/* Customer List */}
      <FlatList
        data={customers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Users size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No customers found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try adjusting your search' : 'Add your first customer to get started'}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => setShowModal(true)} style={styles.emptyAction}>
                <Plus size={20} color="#fff" />
                <Text style={styles.emptyActionText}>Add Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add/Edit Customer Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditingCustomer(null); }} style={styles.modalClose}>
                <ChevronRight size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <CustomerForm
              customer={editingCustomer}
              onClose={() => { setShowModal(false); setEditingCustomer(null); }}
              onSubmit={(_data: any) => {
                // TODO: Implement create/update
                setShowModal(false);
                setEditingCustomer(null);
                queryClient.invalidateQueries({ queryKey: ['customers'] });
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
            <Text style={styles.confirmTitle}>Delete Customer</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "{editingCustomer?.name}"? This action cannot be undone.
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

function CustomerForm({ customer, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    gstin: customer?.gstin || '',
    address: customer?.address || '',
    city: customer?.city || '',
    state: customer?.state || '',
    pincode: customer?.pincode || '',
    creditLimit: customer?.creditLimit?.toString() || '0',
    paymentTerms: customer?.paymentTerms?.toString() || '0',
  });

  return (
    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.formSectionTitle}>Basic Information</Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Name *"
            value={formData.name}
            onChangeText={(v) => setFormData({ ...formData, name: v })}
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            placeholder="Phone *"
            value={formData.phone}
            onChangeText={(v) => setFormData({ ...formData, phone: v })}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Email"
            value={formData.email}
            onChangeText={(v) => setFormData({ ...formData, email: v })}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="GSTIN"
            value={formData.gstin}
            onChangeText={(v) => setFormData({ ...formData, gstin: v })}
            style={styles.input}
            autoCapitalize="characters"
          />
        </View>

        <Text style={styles.formSectionTitle}>Address</Text>
        <TextInput
          placeholder="Address"
          value={formData.address}
          onChangeText={(v) => setFormData({ ...formData, address: v })}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
        />

        <View style={styles.inputRow}>
          <TextInput
            placeholder="City"
            value={formData.city}
            onChangeText={(v) => setFormData({ ...formData, city: v })}
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            placeholder="State"
            value={formData.state}
            onChangeText={(v) => setFormData({ ...formData, state: v })}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Pincode"
            value={formData.pincode}
            onChangeText={(v) => setFormData({ ...formData, pincode: v })}
            style={styles.input}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.formSectionTitle}>Credit Terms</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Credit Limit"
            value={formData.creditLimit}
            onChangeText={(v) => setFormData({ ...formData, creditLimit: v })}
            style={styles.input}
            keyboardType="decimal-pad"
          />
          <TextInput
            placeholder="Payment Terms (days)"
            value={formData.paymentTerms}
            onChangeText={(v) => setFormData({ ...formData, paymentTerms: v })}
            style={styles.input}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSubmit(formData)} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>{customer ? 'Update' : 'Create'}</Text>
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
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  customerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customerInfo: { flex: 1, minWidth: 0 },
  customerName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  customerPhone: { fontSize: 14, color: '#64748b', marginTop: 2 },
  customerMeta: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#94a3b8' },
  customerRight: { alignItems: 'flex-end', minWidth: 100 },
  balanceContainer: { alignItems: 'flex-end', marginBottom: 4 },
  balanceLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 18, fontWeight: '700' },
  balanceReceivable: { color: '#ef4444' },
  balancePayable: { color: '#22c55e' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40 },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: '#0ea5e9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyActionText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  skeletonCard: { height: 80, backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  modalClose: { padding: 4 },
  formScroll: { flex: 1 },
  form: { padding: 20, gap: 20 },
  formSectionTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8, paddingTop: 8 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, height: 48, paddingHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, fontSize: 16, color: '#1e293b' },
  textArea: { height: 80, paddingTop: 12 },
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