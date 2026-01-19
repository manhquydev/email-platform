import { useThemeStore } from '@/store/themeStore';
import type { Theme } from '@/theme/colors';

/**
 * Hook to access the current theme colors
 */
export function useTheme(): Theme {
  return useThemeStore((s) => s.theme);
}

/**
 * Hook to access theme mode and setter
 */
export function useThemeMode() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const colorScheme = useThemeStore((s) => s.colorScheme);

  return { mode, setMode, colorScheme };
}
