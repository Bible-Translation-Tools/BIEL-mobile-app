import { PreferenceKeys } from '@/constants/preferences';

import { getPreference, setPreference } from './preferences';

export const DEFAULT_AUDIO_VOLUME = 1;

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export async function loadAudioVolumePreference(): Promise<number> {
  const raw = await getPreference(PreferenceKeys.audioVolume);
  if (raw == null) return DEFAULT_AUDIO_VOLUME;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_AUDIO_VOLUME;
  return clampVolume(parsed);
}

export async function saveAudioVolumePreference(volume: number): Promise<void> {
  await setPreference(PreferenceKeys.audioVolume, String(clampVolume(volume)));
}
