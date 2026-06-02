export const ThemePreferences = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof ThemePreferences)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export function isThemePreference(value: string): value is ThemePreference {
  return (ThemePreferences as readonly string[]).includes(value);
}
