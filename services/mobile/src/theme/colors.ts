/**
 * Color themes for light and dark modes
 */

export const lightTheme = {
  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Brand
  primary: '#8B5CF6',
  primaryLight: '#F3E8FF',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.05)',
};

export const darkTheme = {
  // Backgrounds
  background: '#111827',
  surface: '#1F2937',
  surfaceSecondary: '#374151',

  // Text
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',

  // Brand
  primary: '#A78BFA',
  primaryLight: '#312E81',

  // Semantic
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Borders
  border: '#374151',
  borderLight: '#4B5563',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export type Theme = typeof lightTheme;
export type ThemeColors = keyof Theme;
