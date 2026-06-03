export const SUPPORTED_LOCALE_CODES = [
  'en',
  'es',
  'fr',
  'pt',
  'de',
  'zh',
  'hi',
  'id',
  'vi',
  'ru',
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALE_CODES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export type LocaleMeta = {
  code: AppLocale;
  /** Native name shown in the interface-language dropdown. */
  nativeLabel: string;
};

export const SUPPORTED_LOCALES: Record<AppLocale, LocaleMeta> = {
  en: { code: 'en', nativeLabel: 'English' },
  es: { code: 'es', nativeLabel: 'Español' },
  fr: { code: 'fr', nativeLabel: 'Français' },
  pt: { code: 'pt', nativeLabel: 'Português' },
  de: { code: 'de', nativeLabel: 'Deutsch' },
  zh: { code: 'zh', nativeLabel: '中文' },
  hi: { code: 'hi', nativeLabel: 'हिन्दी' },
  id: { code: 'id', nativeLabel: 'Bahasa Indonesia' },
  vi: { code: 'vi', nativeLabel: 'Tiếng Việt' },
  ru: { code: 'ru', nativeLabel: 'Русский' },
};

/** Map device language tags to supported app locale codes. */
export const DEVICE_LOCALE_ALIASES: Record<string, AppLocale> = {
  'pt-br': 'pt',
  'pt-pt': 'pt',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  'zh-sg': 'zh',
  'zh-hk': 'zh',
  'zh-tw': 'zh',
  'zh-hant': 'zh',
  'in': 'id',
  'id-id': 'id',
  'vi-vn': 'vi',
  'ru-ru': 'ru',
};

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALE_CODES as readonly string[]).includes(value);
}

export function resolveAppLocale(candidate: string | null | undefined): AppLocale {
  if (candidate != null && isAppLocale(candidate)) {
    return candidate;
  }
  return DEFAULT_LOCALE;
}
