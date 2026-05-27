import { graphqlRequest } from '@/lib/graphql/client';
import { CHAPTER_AUDIO_FILE_QUERY } from '@/lib/graphql/queries';
import { parseCueVerseTimings } from '@/services/audio-parsing';
import type { ChapterAudioQueryResult, VerseTiming } from '@/types/audio';

export async function fetchChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
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

  return null;
}

export async function fetchChapterTimingUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
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

  return null;
}

export async function fetchChapterVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[]> {
  const url = await fetchChapterTimingUrl(languageCode, bookSlug, chapter);
  if (!url) return [];

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download timing file (${response.status})`);
  }

  const text = await response.text();
  return parseCueVerseTimings(text);
}
