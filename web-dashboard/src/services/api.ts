import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add idempotency key for mutations
    if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
      config.headers['X-Idempotency-Key'] = crypto.randomUUID();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Products
  getProducts: (params?: any) => api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string, force?: boolean) => api.delete(`/products/${id}`, { params: { force } }),
  restoreProduct: (id: string) => api.post(`/products/${id}/restore`),
  bulkUpdateProducts: (ids: string[], updates: any) => api.post('/products/bulk-update', { ids, updates }),

  // Categories
  getCategories: (params?: any) => api.get('/categories', { params }),
  getCategoryTree: () => api.get('/categories/tree'),
  getCategory: (id: string) => api.get(`/categories/${id}`),
  createCategory: (data: any) => api.post('/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
  reorderCategories: (categoryOrders: any[]) => api.post('/categories/reorder', { categoryOrders }),

  // Batches
  getBatches: (params?: any) => api.get('/batches', { params }),
  getBatch: (id: string) => api.get(`/batches/${id}`),
  createBatch: (data: any) => api.post('/batches', data),
  updateBatch: (id: string, data: any) => api.put(`/batches/${id}`, data),
  deleteBatch: (id: string) => api.delete(`/batches/${id}`),
  writeOffBatch: (id: string, reason: string) => api.post(`/batches/${id}/write-off`, { reason }),

  // Suppliers
  getSuppliers: (params?: any) => api.get('/suppliers', { params }),
  getSupplier: (id: string) => api.get(`/suppliers/${id}`),
  createSupplier: (data: any) => api.post('/suppliers', data),
  updateSupplier: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/suppliers/${id}`),
  recordSupplierPayment: (id: string, data: any) => api.post(`/suppliers/${id}/payments`, data),
  getSupplierLedger: (id: string, params?: any) => api.get(`/suppliers/${id}/ledger`, { params }),

  // Customers
  getCustomers: (params?: any) => api.get('/customers', { params }),
  getCustomer: (id: string) => api.get(`/customers/${id}`),
  createCustomer: (data: any) => api.post('/customers', data),
  updateCustomer: (id: string, data: any) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),
  recordCustomerPayment: (id: string, data: any) => api.post(`/customers/${id}/payments`, data),
  createCreditNote: (id: string, data: any) => api.post(`/customers/${id}/credit-notes`, data),
  getCustomerLedger: (id: string, params?: any) => api.get(`/customers/${id}/ledger`, { params }),
  getCustomerStatement: (id: string, params?: any) => api.get(`/customers/${id}/statement`, { params }),

  // Purchases
  getPurchases: (params?: any) => api.get('/purchases', { params }),
  getPurchase: (id: string) => api.get(`/purchases/${id}`),
  createPurchase: (data: any) => api.post('/purchases', data),
  updatePurchase: (id: string, data: any) => api.put(`/purchases/${id}`, data),
  cancelPurchase: (id: string, reason: string) => api.post(`/purchases/${id}/cancel`, { reason }),

  // Sales
  getSales: (params?: any) => api.get('/sales', { params }),
  getSale: (id: string) => api.get(`/sales/${id}`),
  createSale: (data: any) => api.post('/sales', data),
  updateSale: (id: string, data: any) => api.put(`/sales/${id}`, data),
  cancelSale: (id: string, reason: string) => api.post(`/sales/${id}/cancel`, { reason }),
  recordSalePayment: (id: string, data: any) => api.post(`/sales/${id}/payments`, data),

  // Stock
  getStockMovements: (params?: any) => api.get('/stock/movements', { params }),
  getStockSummary: (productId: string) => api.get(`/stock/summary/${productId}`),
  createAdjustment: (data: any) => api.post('/stock/adjustments', data),
  getLowStock: (params?: any) => api.get('/stock/low-stock', { params }),
  getOutOfStock: (params?: any) => api.get('/stock/out-of-stock', { params }),

  // Reports
  getDashboardSummary: (period?: string) => api.get('/reports/dashboard', { params: { period } }),
  getStockReport: (params?: any) => api.get('/reports/stock', { params }),
  getSalesReport: (params?: any) => api.get('/reports/sales', { params }),
  getPurchaseReport: (params?: any) => api.get('/reports/purchases', { params }),
  getExpiryReport: (params?: any) => api.get('/reports/expiry', { params }),
  getReceivablesReport: () => api.get('/reports/receivables'),
  getPayablesReport: () => api.get('/reports/payables'),
  getStockMovementsReport: (params?: any) => api.get('/reports/stock-movements', { params }),

  // Payments
  getPayments: (params?: any) => api.get('/payments', { params }),
  getPayment: (id: string) => api.get(`/payments/${id}`),
  createPayment: (data: any) => api.post('/payments', data),
  deletePayment: (id: string) => api.delete(`/payments/${id}`),

  // Notifications
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markNotificationRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/notifications/read-all'),
  dismissNotification: (id: string) => api.post(`/notifications/${id}/dismiss`),

  // Settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),
  getUserPreferences: () => api.get('/settings/preferences'),
  updateUserPreferences: (preferences: any) => api.put('/settings/preferences', { preferences }),
  getInvoicePreview: () => api.get('/settings/invoice-preview'),

  // Import/Export
  exportProducts: (params?: any) => api.get('/import-export/export/products', { params, responseType: 'blob' }),
  exportSales: (params?: any) => api.get('/import-export/export/sales', { params, responseType: 'blob' }),
  exportPurchases: (params?: any) => api.get('/import-export/export/purchases', { params, responseType: 'blob' }),
  exportStock: (params?: any) => api.get('/import-export/export/stock', { params, responseType: 'blob' }),
  exportReceivables: () => api.get('/import-export/export/receivables', { responseType: 'blob' }),
  exportPayables: () => api.get('/import-export/export/payables', { responseType: 'blob' }),
  importProducts: (csv: string, dryRun?: boolean) => api.post('/import-export/import/products', { csv, dryRun }),
  getProductImportTemplate: () => api.get('/import-export/import/template/products', { responseType: 'blob' }),
  backup: () => api.post('/import-export/backup'),
  restore: () => api.post('/import-export/restore'),

  // Auth
  login: (data: { phone: string; password: string; shopId?: string }) => api.post('/auth/login', data),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
  forgotPassword: (phone: string) => api.post('/auth/forgot-password', { phone }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),

  // Shop
  getShopProfile: () => api.get('/shop/profile'),
  updateShopProfile: (data: any) => api.put('/shop/profile', data),
  getShopSettings: () => api.get('/shop/settings'),
  updateShopSettings: (data: any) => api.put('/shop/settings', data),
  getShopStats: () => api.get('/shop/stats'),
});

export default api;