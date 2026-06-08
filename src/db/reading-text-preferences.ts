import { PreferenceKeys } from '@/constants/preferences';
import {
  LINE_HEIGHT_LEVEL_DEFAULT,
  LINE_HEIGHT_LEVEL_MAX,
  LINE_HEIGHT_LEVEL_MIN,
  TEXT_SIZE_LEVEL_DEFAULT,
  TEXT_SIZE_LEVEL_MAX,
  TEXT_SIZE_LEVEL_MIN,
} from '@/constants/reading-text-settings';

import { deletePreference, getPreference, setPreference } from './preferences';

export type ReadingTextPreferenceLevels = {
  textSizeLevel: number;
  lineHeightLevel: number;
};

function clampLevel(level: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, level));
}

function parseLevel(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clampLevel(parsed, min, max);
}

export async function loadReadingTextPreferences(): Promise<ReadingTextPreferenceLevels> {
  const [textSizeRaw, lineHeightRaw] = await Promise.all([
    getPreference(PreferenceKeys.textSize),
    getPreference(PreferenceKeys.lineHeight),
  ]);

  return {
    textSizeLevel: parseLevel(textSizeRaw, TEXT_SIZE_LEVEL_MIN, TEXT_SIZE_LEVEL_MAX, TEXT_SIZE_LEVEL_DEFAULT),
    lineHeightLevel: parseLevel(lineHeightRaw, LINE_HEIGHT_LEVEL_MIN, LINE_HEIGHT_LEVEL_MAX, LINE_HEIGHT_LEVEL_DEFAULT),
  };
}

export async function saveReadingTextPreferences(
  textSizeLevel: number,
  lineHeightLevel: number,
): Promise<void> {
  await Promise.all([
    setPreference(PreferenceKeys.textSize, String(textSizeLevel)),
    setPreference(PreferenceKeys.lineHeight, String(lineHeightLevel)),
  ]);
}

export async function clearReadingTextPreferences(): Promise<void> {
  await Promise.all([
    deletePreference(PreferenceKeys.textSize),
    deletePreference(PreferenceKeys.lineHeight),
  ]);
}
