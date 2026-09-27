import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import {
  getOfflineChapterAudioUri,
  getOfflineChapterCueText,
} from '@/api/services/offline-audio';
import { getVerseTimingParser } from '@/domain/verse-timing';
import type { TimingFileFormat, VerseTiming } from '@/types/audio';

/** Timing format of both downloaded and remote chapter timing files. */
const TIMING_FORMAT: TimingFileFormat = 'cue';

export async function fetchChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const localUri = await getOfflineChapterAudioUri(languageCode, bookSlug, chapter);
  if (localUri) return localUri;

  try {
    const files = await catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'mp3');
    if (files[0]) return files[0].url;
  } catch {
    const offlineUri = await getOfflineChapterAudioUri(languageCode, bookSlug, chapter);
    if (offlineUri) return offlineUri;
    throw new Error('Audio is not available offline');
  }

  return null;
}

export async function fetchChapterTimingUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  try {
    const files = await catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'cue');
    return files[0]?.url ?? null;
  } catch {
    return null;
  }
}

export async function fetchChapterVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[]> {
  const localCue = await getOfflineChapterCueText(languageCode, bookSlug, chapter);
  if (localCue) {
    return getVerseTimingParser(TIMING_FORMAT).parse(localCue);
  }

  const url = await fetchChapterTimingUrl(languageCode, bookSlug, chapter);
  if (!url) return [];

  try {
    const response = await fetchRenderedContent(url);
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    return getVerseTimingParser(TIMING_FORMAT).parse(text);
  } catch {
    return [];
  }
}
