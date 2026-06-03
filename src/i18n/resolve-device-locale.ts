import { getLocales } from 'expo-localization';

import {
  DEFAULT_LOCALE,
  DEVICE_LOCALE_ALIASES,
  isAppLocale,
  type AppLocale,
} from '@/constants/locale';

function matchSupportedLocale(languageTag: string): AppLocale | null {
  const normalized = languageTag.toLowerCase().replace('_', '-');
  const alias = DEVICE_LOCALE_ALIASES[normalized];
  if (alias != null) {
    return alias;
  }

  const primary = normalized.split('-')[0];
  if (isAppLocale(primary)) {
    return primary;
  }
  if (isAppLocale(normalized)) {
    return normalized;
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

  return DEFAULT_LOCALE;
}
