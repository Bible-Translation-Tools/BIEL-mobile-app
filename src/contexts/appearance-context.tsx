import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Appearance,
  useColorScheme as useSystemColorScheme,
  type ColorSchemeName,
} from 'react-native';

import type { ThemePreference } from '@/constants/appearance';
import { DEFAULT_THEME_PREFERENCE } from '@/constants/appearance';
import { loadAppearancePreference, saveAppearancePreference } from '@/db/appearance-preferences';

type AppearanceContextValue = {
  colorScheme: 'light' | 'dark';
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadAppearancePreference().then((preference) => {
      if (!cancelled) {
        setThemePreferenceState(preference);
        setPreferenceLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;

    Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
    void saveAppearancePreference(themePreference);
  }, [themePreference, preferenceLoaded]);

  const colorScheme = useMemo(
    () => resolveColorScheme(themePreference, systemScheme),
    [themePreference, systemScheme],
  );

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
  }, []);

  const value = useMemo(
    () => ({
      colorScheme,
      themePreference,
      setThemePreference,
    }),
    [colorScheme, themePreference, setThemePreference],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context == null) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return context;
}

export function useColorScheme(): 'light' | 'dark' {
  return useAppearance().colorScheme;
}
