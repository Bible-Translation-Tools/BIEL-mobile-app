import { getVerseTimingParser, timingFileFormatFromSource } from '@/api/audio-timing';
import type { TimingFileFormat } from '@/api/audio-timing';
import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import {
  getOfflineChapterAudioUri,
  getOfflineChapterCueText,
} from '@/api/services/offline-audio';
import type { VerseTiming } from '@/types/audio';

/** Timing format used for locally stored chapter cue files. */
const OFFLINE_TIMING_FORMAT: TimingFileFormat = 'cue';

export async function fetchChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const localUri = await getOfflineChapterAudioUri(languageCode, bookSlug, chapter);
  if (localUri) return localUri;

  try {
    const data = await catalogApi.getChapterAudioFile(languageCode, bookSlug, chapter, 'mp3');

    for (const content of data.content) {
      for (const rendered of content.rendered_contents) {
        if (rendered.url && rendered.url.includes('CONTENTS')) return rendered.url;
      }
    }
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
    const data = await catalogApi.getChapterAudioFile(languageCode, bookSlug, chapter, 'cue');

    for (const content of data.content) {
      for (const rendered of content.rendered_contents) {
        if (rendered.url && rendered.url.includes('CONTENTS')) return rendered.url;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchChapterVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[]> {
  const localCue = await getOfflineChapterCueText(languageCode, bookSlug, chapter);
  if (localCue) {
    return getVerseTimingParser(OFFLINE_TIMING_FORMAT).parse(localCue);
  }

  const url = await fetchChapterTimingUrl(languageCode, bookSlug, chapter);
  if (!url) return [];

  try {
    const response = await fetchRenderedContent(url);
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    const format = timingFileFormatFromSource(url);
    return getVerseTimingParser(format).parse(text);
  } catch {
    return [];
  }
}
