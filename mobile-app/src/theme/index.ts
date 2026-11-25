import { MD3LightTheme } from 'react-native-paper';

/**
 * ShopStock Design System
 * Derived from Stitch "ShopStock Inventory & Wholesale Billing"
 * Focused on clean, high-contrast, counter-friendly usability.
 */
export const colors = {
  // Brand & Accents
  primary: '#0284C7',
  primaryPressed: '#0369A1',
  primarySoft: '#E0F2FE',
  secondary: '#6366F1',
  secondarySoft: '#EEF2FF',

  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  divider: '#F1F5F9',

  // Typography
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  placeholder: '#94A3B8',

  // Semantic Status
  success: '#10B981',
  successText: '#059669',
  successSoft: '#ECFDF5',

  warning: '#F59E0B',
  warningText: '#D97706',
  warningSoft: '#FFFBEB',

  danger: '#EF4444',
  dangerText: '#DC2626',
  dangerSoft: '#FEF2F2',

  orange: '#F97316',
  orangeSoft: '#FFF7ED',
  purple: '#8B5CF6',
  purpleSoft: '#F5F3FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const cardShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
} as const;

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.danger,
    onSurface: colors.text,
    outline: colors.border,
  },
};
