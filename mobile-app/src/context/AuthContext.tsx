import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
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

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

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
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  const login = async (phone: string, password: string, shopId?: string) => {
    const response = await api.post('/auth/login', { phone, password, shopId });
    const { user: userData, accessToken, refreshToken, shop: shopData } = response.data.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    setUser(userData);
    setShop(shopData);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setShop(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        try {
          await refreshUser();
        } catch {
          if (refreshToken) {
            try {
              const response = await api.post('/auth/refresh', { refreshToken });
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
              await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
              await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
              await refreshUser();
            } catch {
              await logout();
            }
          } else {
            await logout();
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