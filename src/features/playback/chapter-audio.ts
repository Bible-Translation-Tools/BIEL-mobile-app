import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/content-fetch';
import { getVerseTimingParser } from '@/domain/verse-timing';
import {
  fetchBookAudioManifest,
  loadOfflineAudioChapterNumbers,
  loadOfflineChapterAudioUri,
  loadOfflineChapterCueText,
} from '@/features/downloads/offline-audio';
import type { TimingFileFormat, VerseTiming } from '@/types/audio';
import type { ChapterItem } from '@/types/book';
import { localFirst, networkFirst } from '@/utils/source-strategy';

/** Timing format of both downloaded and remote chapter timing files. */
const TIMING_FORMAT: TimingFileFormat = 'cue';

/** Chapters of a book that have audio; offline, the chapters with downloaded audio. */
export async function getAudioChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<ChapterItem[]> {
  return networkFirst(
    async () => {
      const manifest = await fetchBookAudioManifest(languageCode, bookSlug);
      return manifest.chapters.map((chapter) => ({ number: chapter.chapter }));
    },
    async () =>
      (await loadOfflineAudioChapterNumbers(languageCode, bookSlug)).map((number) => ({ number })),
    (chapters) => chapters.length > 0,
  );
}

export async function getChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  return localFirst(
    () => loadOfflineChapterAudioUri(languageCode, bookSlug, chapter),
    async () => {
      try {
        const files = await catalogApi.getChapterAudioFiles(languageCode, bookSlug, chapter, 'mp3');
        return files[0]?.url ?? null;
      } catch {
        throw new Error('Audio is not available offline');
      }
    },
  );
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

async function loadOfflineVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[] | null> {
  const localCue = await loadOfflineChapterCueText(languageCode, bookSlug, chapter);
  return localCue ? getVerseTimingParser(TIMING_FORMAT).parse(localCue) : null;
}

/** Missing or unreadable remote timings yield an empty list. */
async function fetchVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[]> {
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

export async function getChapterVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[]> {
  return localFirst(
    () => loadOfflineVerseTimings(languageCode, bookSlug, chapter),
    () => fetchVerseTimings(languageCode, bookSlug, chapter),
  );
}
