import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from '@/constants/locale';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';

export const i18nNamespaces = [
  'common',
  'home',
  'books',
  'reading',
  'download',
  'settings',
  'locale',
] as const;

const resources = {
  en,
  es,
  fr,
} as const;

let initialized = false;

export async function initI18n(locale: string): Promise<AppLocale> {
  const resolved = resolveAppLocale(locale);

  if (!initialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: resolved,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: [...i18nNamespaces],
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
    initialized = true;
    return resolved;
  }

  await i18n.changeLanguage(resolved);
  return resolved;
}

export { i18n };
