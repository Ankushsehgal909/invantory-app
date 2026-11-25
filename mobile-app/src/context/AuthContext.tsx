import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';
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

const ACCESS_TOKEN_SERVICE = 'shopstock.accessToken';
const REFRESH_TOKEN_SERVICE = 'shopstock.refreshToken';

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
      await Keychain.resetGenericPassword({ service: ACCESS_TOKEN_SERVICE });
      await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  const login = async (phone: string, password: string, shopId?: string) => {
    const response = await api.post('/auth/login', { phone, password, shopId });
    const { user: userData, accessToken, refreshToken, shop: shopData } = response.data.data;

    await Keychain.setGenericPassword('accessToken', accessToken, { service: ACCESS_TOKEN_SERVICE });
    await Keychain.setGenericPassword('refreshToken', refreshToken, { service: REFRESH_TOKEN_SERVICE });
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    setUser(userData);
    setShop(shopData);
  };

  const logout = async () => {
    await Keychain.resetGenericPassword({ service: ACCESS_TOKEN_SERVICE });
    await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setShop(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const accessTokenCreds = await Keychain.getGenericPassword({ service: ACCESS_TOKEN_SERVICE });
      const refreshTokenCreds = await Keychain.getGenericPassword({ service: REFRESH_TOKEN_SERVICE });

      const accessToken = accessTokenCreds ? accessTokenCreds.password : undefined;
      const refreshToken = refreshTokenCreds ? refreshTokenCreds.password : undefined;

      if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        try {
          await refreshUser();
        } catch {
          if (refreshToken) {
            try {
              const response = await api.post('/auth/refresh', { refreshToken });
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
              await Keychain.setGenericPassword('accessToken', newAccessToken, { service: ACCESS_TOKEN_SERVICE });
              await Keychain.setGenericPassword('refreshToken', newRefreshToken, { service: REFRESH_TOKEN_SERVICE });
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