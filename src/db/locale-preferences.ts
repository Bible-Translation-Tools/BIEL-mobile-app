import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from '@/constants/locale';
import { PreferenceKeys } from '@/constants/preferences';

import { getPreference, setPreference } from './preferences';

export async function loadLocalePreference(): Promise<AppLocale | null> {
  const raw = await getPreference(PreferenceKeys.uiLocale);
  if (raw != null && isAppLocale(raw)) {
    return raw;
  }
  return null;
}

export async function saveLocalePreference(locale: AppLocale): Promise<void> {
  await setPreference(PreferenceKeys.uiLocale, locale);
}

export { DEFAULT_LOCALE };
