import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from '@/constants/locale';
import { localeResources } from '@/locales';

export const i18nNamespaces = Object.keys(localeResources.en) as Array<
  keyof typeof localeResources.en
>;

const resources = localeResources;

let initialized = false;

export async function initI18n(locale: string): Promise<AppLocale> {
  const resolved = resolveAppLocale(locale);

  if (!initialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: resolved,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: i18nNamespaces,
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
