import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Edit, Trash2, ChevronLeft, Barcode, AlertTriangle, Eye, Plus, Minus, Download, Upload } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { formatCurrencyMajor as formatCurrency, formatDate } from '@shopstock/shared/utils';

interface ProductDetailScreenProps {
  route: { params: { product: any } };
  navigation: any;
}

export function ProductDetailScreen({ route, navigation }: ProductDetailScreenProps) {
  const queryClient = useQueryClient();
  const { product: initialProduct } = route.params;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['product', initialProduct.id],
    queryFn: () => apiHelpers.getProduct(initialProduct.id),
    select: (response) => response.data.data.product,
    enabled: !!initialProduct?.id,
  });

  const product = response || initialProduct;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to delete product');
    },
  });

  if (isLoading && !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => { setEditingProduct(product); setShowEditModal(true); }} style={styles.actionButton}>
            <Edit size={20} color="#0ea5e9" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={[styles.productIconLarge, { backgroundColor: product.category?.color ? `${product.category.color}20` : '#0ea5e920' }]}>
            <Package size={36} color={product.category?.color || '#0ea5e9'} />
          </View>
          <View style={styles.productHeaderInfo}>
            <Text style={styles.productNameLarge}>{product.name}</Text>
            <Text style={styles.productSkuLarge}>SKU: {product.sku}</Text>
            <View style={styles.productBadges}>
              {product.category && (
                <View style={[styles.badge, { backgroundColor: product.category.color ? `${product.category.color}20` : '#e2e8f0' }]}>
                  <Text style={[styles.badgeText, { color: product.category.color || '#64748b' }]}>
                    {product.category.name}
                  </Text>
                </View>
              )}
              {product.hasVariants && (
                <View style={styles.badgeVariant}>
                  <Text style={styles.badgeVariantText}>Variants</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stock Status Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stock Status</Text>
          </View>
          <View style={styles.stockCards}>
            <View style={[styles.stockCard, { borderLeftColor: product.totalStock <= 0 ? '#ef4444' : product.totalStock <= (product.reorderLevel || 10) ? '#f59e0b' : '#22c55e' }]}>
              <Text style={styles.stockCardLabel}>Current Stock</Text>
              <Text style={styles.stockCardValue}>{product.totalStock} {product.baseUnit}</Text>
            </View>
            <View style={styles.stockCard}>
              <Text style={styles.stockCardLabel}>Reorder Level</Text>
              <Text style={styles.stockCardValue}>{product.reorderLevel} {product.baseUnit}</Text>
            </View>
            <View style={styles.stockCard}>
              <Text style={styles.stockCardLabel}>Stock Value (Cost)</Text>
              <Text style={styles.stockCardValue}>{formatCurrency(product.totalStock * (product.purchasePrice || 0))}</Text>
            </View>
            <View style={styles.stockCard}>
              <Text style={styles.stockCardLabel}>Stock Value (Sale)</Text>
              <Text style={styles.stockCardValue}>{formatCurrency(product.totalStock * (product.salePrice || 0))}</Text>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>
          <View style={styles.pricingGrid}>
            <View style={styles.priceCard}>
              <Text style={styles.priceCardLabel}>Purchase Price</Text>
              <Text style={styles.priceCardValue}>{formatCurrency(product.purchasePrice || 0)}</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceCardLabel}>Sale Price</Text>
              <Text style={styles.priceCardValue}>{formatCurrency(product.salePrice || 0)}</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceCardLabel}>MRP</Text>
              <Text style={styles.priceCardValue}>{formatCurrency(product.mrp || 0)}</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceCardLabel}>Tax Rate</Text>
              <Text style={styles.priceCardValue}>{product.taxRate || 0}%</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceCardLabel}>Margin</Text>
              <Text style={[styles.priceCardValue, { color: '#22c55e' }]}>
                {product.purchasePrice && product.salePrice > 0
                  ? (((product.salePrice - product.purchasePrice) / product.purchasePrice) * 100).toFixed(1) + '%'
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceCardLabel}>Base Unit</Text>
              <Text style={styles.priceCardValue}>{product.baseUnit}</Text>
            </View>
          </View>
        </View>

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Variants ({product.variants.length})</Text>
            </View>
            <View style={styles.variantsList}>
              {product.variants.map((variant: any) => (
                <View key={variant.id} style={styles.variantCard}>
                  <View style={styles.variantLeft}>
                    <Text style={styles.variantName}>{variant.name}</Text>
                    <Text style={styles.variantSku}>SKU: {variant.sku}</Text>
                  </View>
                  <View style={styles.variantRight}>
                    <Text style={[styles.variantStock, variant.stock <= 0 ? styles.variantStockOut : variant.stock <= 5 ? styles.variantStockLow : '']}>
                      Stock: {variant.stock}
                    </Text>
                    <Text style={styles.variantPrice}>{formatCurrency(variant.salePrice)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Batches */}
        {product.batches && product.batches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Batches ({product.batches.length})</Text>
            </View>
            <View style={styles.batchesList}>
              {product.batches.map((batch: any) => (
                <View key={batch.id} style={styles.batchCard}>
                  <View style={styles.batchLeft}>
                    <Text style={styles.batchNumber}>{batch.batchNumber}</Text>
                    <Text style={styles.batchMeta}>
                      {batch.expiryDate ? `Expires: ${formatDate(batch.expiryDate)}` : 'No expiry'}
                      {batch.manufacturingDate && ` • Mfg: ${formatDate(batch.manufacturingDate)}`}
                    </Text>
                  </View>
                  <View style={styles.batchRight}>
                    <Text style={[
                      styles.batchStock,
                      batch.quantity <= 0 ? styles.batchStockOut : batch.quantity <= 10 ? styles.batchStockLow : ''
                    ]}>
                      {batch.quantity} {product.baseUnit}
                    </Text>
                    <Text style={styles.batchPrice}>{formatCurrency(batch.purchasePrice)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {product.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Information</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>{formatDate(product.createdAt)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Updated</Text>
              <Text style={styles.infoValue}>{formatDate(product.updatedAt)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent={true}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <AlertTriangle size={48} color="#f59e0b" style={styles.confirmIcon} />
            <Text style={styles.confirmTitle}>Delete Product</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "{product.name}"? This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { deleteMutation.mutate(product.id); setShowDeleteModal(false); }} style={styles.confirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingProduct(null); }} style={styles.modalClose}>
                <Eye size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ProductForm
              product={editingProduct}
              onClose={() => { setShowEditModal(false); setEditingProduct(null); }}
              onSubmit={(data) => {
                // TODO: Implement update
                setShowEditModal(false);
                setEditingProduct(null);
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['product', product.id] });
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProductForm({ product, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    categoryId: product?.categoryId || '',
    barcode: product?.barcode || '',
    purchasePrice: product?.purchasePrice?.toString() || '',
    salePrice: product?.salePrice?.toString() || '',
    mrp: product?.mrp?.toString() || '',
    reorderLevel: product?.reorderLevel?.toString() || '10',
    baseUnit: product?.baseUnit || 'pcs',
    hasVariants: product?.hasVariants || false,
    variantType: product?.variantType || 'none',
    taxRate: product?.taxRate?.toString() || '0',
    description: product?.description || '',
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#64748b' },
  scrollView: { flex: 1 },
  productHeader: { flexDirection: 'row', padding: 20, gap: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  productIconLarge: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productHeaderInfo: { flex: 1 },
  productNameLarge: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  productSkuLarge: { fontSize: 14, color: '#64748b', marginTop: 4 },
  productBadges: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  badgeVariant: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#e0e7ff' },
  badgeVariantText: { fontSize: 12, fontWeight: '500', color: '#3730a3' },
  section: { padding: 20, backgroundColor: '#fff', marginTop: 8 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  stockCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stockCard: { flex: 1, minWidth: '45%', padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: 4 },
  stockCardLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  stockCardValue: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  priceCard: { flex: 1, minWidth: '30%', padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  priceCardLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  priceCardValue: { fontSize: 18, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  variantsList: { gap: 12 },
  variantCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  variantLeft: { flex: 1 },
  variantName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  variantSku: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  variantRight: { alignItems: 'flex-end', gap: 4 },
  variantStock: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  variantStockLow: { color: '#f59e0b' },
  variantStockOut: { color: '#ef4444' },
  variantPrice: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  batchesList: { gap: 12 },
  batchCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  batchLeft: { flex: 1 },
  batchNumber: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  batchMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  batchRight: { alignItems: 'flex-end', gap: 4 },
  batchStock: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  batchStockLow: { color: '#f59e0b' },
  batchStockOut: { color: '#ef4444' },
  batchPrice: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  descriptionText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
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