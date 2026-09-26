import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { getOfflineChapterHtml } from '@/api/services/offline-text';
import { buildChapterContentFromHtml } from '@/domain/chapter-html-parser';
import { pickRendering } from '@/domain/resource-selection';
import type { ChapterContent } from '@/types/reading';

async function fetchChapterContentFromNetwork(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent> {
  const renderings = await catalogApi.getChapterRenderings(languageCode, bookSlug, chapter);

  const rendering = pickRendering(renderings, {
    bookSlug,
    requireChapter: true,
  });
  if (!rendering?.chapter) {
    throw new Error('Chapter not found');
  }

  const apiUrl = rendering.url;
  if (!apiUrl) {
    throw new Error('Chapter rendered URL is missing');
  }

  const response = await fetchRenderedContent(apiUrl);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn('[reader] chapter fetch failed', {
      apiUrl,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: errorBody.slice(0, 300),
    });
    throw new Error(`Failed to load chapter (${response.status})`);
  }

  const html = await response.text();
  return buildChapterContentFromHtml(html, rendering.bookName, rendering.chapter);
}

export async function fetchChapterContent(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent> {
  const offline = await getOfflineChapterHtml(languageCode, bookSlug, chapter);
  if (offline) {
    return buildChapterContentFromHtml(offline.html, offline.bookName, chapter);
  }

  return fetchChapterContentFromNetwork(languageCode, bookSlug, chapter);
}
