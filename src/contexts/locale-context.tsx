import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { SUPPORTED_LOCALES, type AppLocale } from '@/constants/locale';
import { i18n } from '@/i18n';
import { saveLocalePreference } from '@/db/locale-preferences';

type LocaleContextValue = {
  uiLocale: AppLocale;
  localeLabel: string;
  setUiLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  children: ReactNode;
  initialLocale: AppLocale;
};

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [uiLocale, setUiLocaleState] = useState<AppLocale>(initialLocale);

  const setUiLocale = useCallback((locale: AppLocale) => {
    setUiLocaleState(locale);
    void i18n.changeLanguage(locale);
    void saveLocalePreference(locale);
  }, []);

  const value = useMemo(
    () => ({
      uiLocale,
      localeLabel: SUPPORTED_LOCALES[uiLocale].nativeLabel,
      setUiLocale,
    }),
    [uiLocale, setUiLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context == null) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
