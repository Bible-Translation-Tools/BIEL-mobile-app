import { graphqlRequest } from '@/lib/graphql/client';
import { CHAPTER_AUDIO_QUERY } from '@/lib/graphql/queries';
import type { ChapterAudioQueryResult } from '@/types/audio';

export async function fetchChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const data = await graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (rendered.url && rendered.url.includes('CONTENTS')) return rendered.url;
    }
  }

  return null;
}
