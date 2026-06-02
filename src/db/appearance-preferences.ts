import { DEFAULT_THEME_PREFERENCE, isThemePreference } from '@/constants/appearance';
import type { ThemePreference } from '@/constants/appearance';
import { PreferenceKeys } from '@/constants/preferences';

import { getPreference, setPreference } from './preferences';

export async function loadAppearancePreference(): Promise<ThemePreference> {
  const raw = await getPreference(PreferenceKeys.theme);
  if (raw != null && isThemePreference(raw)) {
    return raw;
  }
  return DEFAULT_THEME_PREFERENCE;
}

export async function saveAppearancePreference(preference: ThemePreference): Promise<void> {
  await setPreference(PreferenceKeys.theme, preference);
}
