import axios from 'axios';
import * as Keychain from 'react-native-keychain';

const API_URL = __DEV__ ? 'http://10.0.2.2:4000/api/v1' : 'https://api.shopstock.app/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const ACCESS_TOKEN_SERVICE = 'shopstock.accessToken';
const REFRESH_TOKEN_SERVICE = 'shopstock.refreshToken';

// Request interceptor
api.interceptors.request.use(
  (config) => {
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

      const refreshTokenCreds = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
      });
      const refreshToken = refreshTokenCreds ? refreshTokenCreds.password : undefined;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          await Keychain.setGenericPassword('accessToken', accessToken, { service: ACCESS_TOKEN_SERVICE });
          await Keychain.setGenericPassword('refreshToken', newRefreshToken, { service: REFRESH_TOKEN_SERVICE });
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          await Keychain.resetGenericPassword({ service: ACCESS_TOKEN_SERVICE });
          await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
          delete api.defaults.headers.common['Authorization'];
        }
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions (same as web)
export const apiHelpers = {
  getProducts: (params?: any) => api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string, force?: boolean) => api.delete(`/products/${id}`, { params: { force } }),

  getCategories: (params?: any) => api.get('/categories', { params }),
  getCategoryTree: () => api.get('/categories/tree'),

  getBatches: (params?: any) => api.get('/batches', { params }),

  getSuppliers: (params?: any) => api.get('/suppliers', { params }),
  getSupplier: (id: string) => api.get(`/suppliers/${id}`),

  getCustomers: (params?: any) => api.get('/customers', { params }),
  getCustomer: (id: string) => api.get(`/customers/${id}`),

  getPurchases: (params?: any) => api.get('/purchases', { params }),
  getPurchase: (id: string) => api.get(`/purchases/${id}`),
  createPurchase: (data: any) => api.post('/purchases', data),

  getSales: (params?: any) => api.get('/sales', { params }),
  getSale: (id: string) => api.get(`/sales/${id}`),
  createSale: (data: any) => api.post('/sales', data),

  getStockMovements: (params?: any) => api.get('/stock/movements', { params }),
  getLowStock: (params?: any) => api.get('/stock/low-stock', { params }),
  getOutOfStock: (params?: any) => api.get('/stock/out-of-stock', { params }),

  getDashboardSummary: (period?: string) => api.get('/reports/dashboard', { params: { period } }),

  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markNotificationRead: (id: string) => api.post(`/notifications/${id}/read`),

  getSettings: () => api.get('/settings'),
  getInvoicePreview: () => api.get('/settings/invoice-preview'),

  login: (data: { phone: string; password: string; shopId?: string }) => api.post('/auth/login', data),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),

  getShopProfile: () => api.get('/shop/profile'),
  getShopStats: () => api.get('/shop/stats'),
};

export default api;