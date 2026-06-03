import { getLocales } from 'expo-localization';

import {
  DEFAULT_LOCALE,
  isAppLocale,
  SUPPORTED_LOCALE_CODES,
  type AppLocale,
} from '@/constants/locale';

function matchSupportedLocale(languageTag: string): AppLocale | null {
  const normalized = languageTag.toLowerCase().replace('_', '-');
  const primary = normalized.split('-')[0];
  if (isAppLocale(primary)) {
    return primary;
  }
  if (isAppLocale(normalized)) {
    return normalized as AppLocale;
  }
  return null;
}

export function resolveDeviceLocale(): AppLocale {
  for (const { languageTag } of getLocales()) {
    const match = matchSupportedLocale(languageTag);
    if (match != null) {
      return match;
    }
  }

  for (const code of SUPPORTED_LOCALE_CODES) {
    const match = matchSupportedLocale(code);
    if (match != null) {
      return match;
    }
  }

  return DEFAULT_LOCALE;
}
