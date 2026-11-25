import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Search, Filter, Plus, ChevronRight, Edit, Trash2, Barcode, AlertTriangle, Eye, ScanLine } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { formatCurrencyMajor as formatCurrency } from '@shopstock/shared/utils';
import { BarcodeScanner } from '../components/BarcodeScanner';

export function ProductsScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['products', search],
    queryFn: () => apiHelpers.getProducts({ search: search || undefined, limit: 100 }),
    select: (response) => response.data.data,
  });

  const products = response?.products ?? [];
  const pagination = response?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setDeletingId(null);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (product: any) => {
    setEditingProduct(product);
    setDeletingId(product.id);
    setModalVisible(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <View style={styles.productLeft}>
        <View style={[styles.productIcon, { backgroundColor: item.category?.color ? `${item.category.color}20` : '#0ea5e920' }]}>
          <Package size={24} color={item.category?.color || '#0ea5e9'} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productCategory}>{item.category?.name || 'No Category'}</Text>
            {item.hasVariants && (
              <View style={styles.variantBadge}>
                <Text style={styles.variantBadgeText}>Variants</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.productRight}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockLabel}>Stock</Text>
          <Text style={[
            styles.stockValue,
            (item.currentStock ?? item.totalStock ?? 0) <= 0
              ? styles.stockOut
              : (item.currentStock ?? item.totalStock ?? 0) <= (item.reorderLevel || 10)
              ? styles.stockLow
              : styles.stockNormal,
          ]}>
            {item.currentStock ?? item.totalStock ?? 0} {item.baseUnit || item.unit || 'pcs'}
          </Text>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Sale Price</Text>
          <Text style={styles.priceValue}>{formatCurrency(item.sellingPrice ?? item.salePrice ?? 0)}</Text>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !products.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Products</Text>
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
          <Text style={styles.title}>Products</Text>
          <Text style={styles.subtitle}>{products.length} products</Text>
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
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowScanner(true)}
          style={styles.filterButton}
          accessibilityLabel="Scan barcode"
        >
          <ScanLine size={20} color="#0284C7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try adjusting your search' : 'Add your first product to get started'}
            </Text>
            {!search && (
              <TouchableOpacity onPress={() => setShowModal(true)} style={styles.emptyAction}>
                <Plus size={20} color="#fff" />
                <Text style={styles.emptyActionText}>Add Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add/Edit Product Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditingProduct(null); }} style={styles.modalClose}>
                <Eye size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ProductForm
              product={editingProduct}
              onClose={() => { setShowModal(false); setEditingProduct(null); }}
              onSubmit={(_data: any) => {
                // TODO: Implement create/update
                setShowModal(false);
                setEditingProduct(null);
                queryClient.invalidateQueries({ queryKey: ['products'] });
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <AlertTriangle size={48} color="#f59e0b" style={styles.confirmIcon} />
            <Text style={styles.confirmTitle}>Delete Product</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "{editingProduct?.name}"? This action cannot be undone.
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
      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <BarcodeScanner
          onScan={(barcode) => {
            setSearch(barcode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

function ProductForm({ product, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    barcode: '',
    purchasePrice: '',
    salePrice: '',
    mrp: '',
    reorderLevel: '10',
    baseUnit: 'pcs',
    hasVariants: false,
    variantType: 'none',
    taxRate: '0',
    description: '',
  });

  return (
    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.formSectionTitle}>Basic Information</Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Product Name *"
            value={formData.name}
            onChangeText={(v) => setFormData({ ...formData, name: v })}
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            placeholder="SKU *"
            value={formData.sku}
            onChangeText={(v) => setFormData({ ...formData, sku: v })}
            style={styles.input}
            autoCapitalize="characters"
          />
        </View>

        <TextInput
          placeholder="Barcode"
          value={formData.barcode}
          onChangeText={(v) => setFormData({ ...formData, barcode: v })}
          style={styles.input}
        />

        <TextInput
          placeholder="Description"
          value={formData.description}
          onChangeText={(v) => setFormData({ ...formData, description: v })}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.formSectionTitle}>Pricing</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Purchase Price"
            value={formData.purchasePrice}
            onChangeText={(v) => setFormData({ ...formData, purchasePrice: v })}
            style={styles.input}
            keyboardType="decimal-pad"
          />
          <TextInput
            placeholder="Sale Price *"
            value={formData.salePrice}
            onChangeText={(v) => setFormData({ ...formData, salePrice: v })}
            style={styles.input}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="MRP"
            value={formData.mrp}
            onChangeText={(v) => setFormData({ ...formData, mrp: v })}
            style={styles.input}
            keyboardType="decimal-pad"
          />
          <TextInput
            placeholder="Tax Rate %"
            value={formData.taxRate}
            onChangeText={(v) => setFormData({ ...formData, taxRate: v })}
            style={styles.input}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.formSectionTitle}>Inventory</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Reorder Level"
            value={formData.reorderLevel}
            onChangeText={(v) => setFormData({ ...formData, reorderLevel: v })}
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Base Unit"
            value={formData.baseUnit}
            onChangeText={(v) => setFormData({ ...formData, baseUnit: v })}
            style={styles.input}
          />
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onSubmit(formData)} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>{product ? 'Update' : 'Create'}</Text>
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
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  productLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  productSku: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  productCategory: { fontSize: 12, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  variantBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  variantBadgeText: { fontSize: 11, fontWeight: '500', color: '#3730a3' },
  productRight: { alignItems: 'flex-end', minWidth: 100 },
  stockInfo: { alignItems: 'flex-end', marginBottom: 8 },
  stockLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  stockValue: { fontSize: 16, fontWeight: '600' },
  stockNormal: { color: '#22c55e' },
  stockLow: { color: '#f59e0b' },
  stockOut: { color: '#ef4444' },
  priceInfo: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
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