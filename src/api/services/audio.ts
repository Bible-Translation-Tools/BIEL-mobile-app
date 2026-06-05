import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTER_AUDIO_FILE_QUERY } from '@/api/graphql/queries';
import { parseCueVerseTimings } from '@/api/services/audio-timing-utils';
import {
  getOfflineChapterAudioUri,
  getOfflineChapterCueText,
} from '@/api/services/offline-audio';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import type { ChapterAudioQueryResult, VerseTiming } from '@/types/audio';

export async function fetchChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const localUri = await getOfflineChapterAudioUri(languageCode, bookSlug, chapter);
  if (localUri) return localUri;

  try {
    const data = await graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
      languageCode,
      bookSlug,
      chapter,
      fileType: 'mp3',
    });

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
    const data = await graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
      languageCode,
      bookSlug,
      chapter,
      fileType: 'cue',
    });

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
    return parseCueVerseTimings(localCue);
  }

  const url = await fetchChapterTimingUrl(languageCode, bookSlug, chapter);
  if (!url) return [];

  try {
    const response = await fetchRenderedContent(url);
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    return parseCueVerseTimings(text);
  } catch {
    return [];
  }
}
