import { PreferenceKeys } from '@/constants/preferences';

import { getPreference, setPreference } from './preferences';

export async function loadRecentLanguagePreference(): Promise<string | null> {
  const code = await getPreference(PreferenceKeys.recentLanguage);
  return code?.trim() ? code : null;
}

export async function saveRecentLanguagePreference(code: string): Promise<void> {
  await setPreference(PreferenceKeys.recentLanguage, code);
}
