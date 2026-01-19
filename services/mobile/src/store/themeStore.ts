import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from '@/theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  colorScheme: ColorSchemeName;
  theme: Theme;

  // Actions
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'theme_mode';

function getTheme(colorScheme: ColorSchemeName): Theme {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  colorScheme: Appearance.getColorScheme(),
  theme: getTheme(Appearance.getColorScheme()),

  setMode: async (mode: ThemeMode) => {
    let colorScheme: ColorSchemeName;

    if (mode === 'system') {
      colorScheme = Appearance.getColorScheme();
    } else {
      colorScheme = mode;
    }

    set({
      mode,
      colorScheme,
      theme: getTheme(colorScheme),
    });

    await AsyncStorage.setItem(THEME_KEY, mode);
  },

  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored) {
        const mode = stored as ThemeMode;
        let colorScheme: ColorSchemeName;

        if (mode === 'system') {
          colorScheme = Appearance.getColorScheme();
        } else {
          colorScheme = mode;
        }

        set({
          mode,
          colorScheme,
          theme: getTheme(colorScheme),
        });
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  },
}));

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const state = useThemeStore.getState();
  if (state.mode === 'system') {
    useThemeStore.setState({
      colorScheme,
      theme: getTheme(colorScheme),
    });
  }
});
