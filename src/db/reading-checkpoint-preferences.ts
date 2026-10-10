import { PreferenceKeys } from '@/constants/preferences';
import { parseReadingCheckpoint, serializeReadingCheckpoint } from '@/domain/reading-checkpoint';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

import { deletePreference, getPreference, setPreference } from './preferences';

export async function loadReadingCheckpointPreference(): Promise<ReadingCheckpoint | null> {
  return parseReadingCheckpoint(await getPreference(PreferenceKeys.readingCheckpoint));
}

export async function saveReadingCheckpointPreference(
  checkpoint: ReadingCheckpoint,
): Promise<void> {
  await setPreference(PreferenceKeys.readingCheckpoint, serializeReadingCheckpoint(checkpoint));
}

export async function clearReadingCheckpointPreference(): Promise<void> {
  await deletePreference(PreferenceKeys.readingCheckpoint);
}
