import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePalette {
  canvas: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentHighlight: string;
  accentPrimaryMuted: string;
  accentText: string;
  danger: string;
  dangerBg: string;
  statusBarStyle: 'dark' | 'light';
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const lightPalette: ThemePalette = {
  canvas: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F3F4F6',
  surfaceElevated: '#FFFFFF',
  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  accentPrimary: '#093329',
  accentHighlight: '#BCD94E',
  accentPrimaryMuted: '#E6F0EB',
  accentText: '#FFFFFF',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  statusBarStyle: 'dark',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabBarActive: '#093329',
  tabBarInactive: '#9CA3AF',
};

export const darkPalette: ThemePalette = {
  canvas: '#090d0b',
  surface: '#121916',
  surfaceSubtle: '#18221e',
  surfaceElevated: '#1f2c26',
  border: '#20332a',
  borderSubtle: '#14201a',
  textPrimary: '#FAFAFA',
  textSecondary: '#A7BDB5',
  textMuted: '#6B8278',
  accentPrimary: '#BCD94E',
  accentHighlight: '#BCD94E',
  accentPrimaryMuted: 'rgba(188, 217, 78, 0.15)',
  accentText: '#093329',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  statusBarStyle: 'light',
  tabBarBg: '#0b110e',
  tabBarBorder: '#1c2b23',
  tabBarActive: '#BCD94E',
  tabBarInactive: '#6B8278',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ThemePalette;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  theme: darkPalette,
  isDark: true,
  setThemeMode: async () => {},
});

const THEME_STORAGE_KEY = '@linkiac_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      } finally {
        setIsLoaded(true);
      }
    }
    loadSavedTheme();
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => {
    return isDark ? darkPalette : lightPalette;
  }, [isDark]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, theme, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
