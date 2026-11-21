import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { User, Shop } from '@shopstock/shared/types';

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  loading: boolean;
  login: (phone: string, password: string, shopId?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  const login = async (phone: string, password: string, shopId?: string) => {
    const response = await api.post('/auth/login', { phone, password, shopId });
    const { user: userData, accessToken, refreshToken, shop: shopData } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    setUser(userData);
    setShop(shopData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setShop(null);
  };

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        try {
          await refreshUser();
        } catch {
          // Try refresh token
          if (refreshToken) {
            try {
              const response = await api.post('/auth/refresh', { refreshToken });
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
              localStorage.setItem('accessToken', newAccessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
              await refreshUser();
            } catch {
              logout();
            }
          } else {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, shop, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}