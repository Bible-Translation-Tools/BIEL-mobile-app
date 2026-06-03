export const SUPPORTED_LOCALE_CODES = ['en', 'es', 'fr'] as const;

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
