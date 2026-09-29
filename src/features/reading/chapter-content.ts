import { catalogApi } from '@/api/catalog';
import { fetchRenderedContent } from '@/api/content-fetch';
import { buildChapterContentFromHtml } from '@/domain/chapter-html-parser';
import { pickRendering } from '@/domain/resource-selection';
import { loadOfflineChapterHtml } from '@/features/downloads/offline-scripture';
import type { ChapterContent } from '@/types/reading';
import { localFirst } from '@/utils/source-strategy';

async function loadOfflineChapterContent(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent | null> {
  const offline = await loadOfflineChapterHtml(languageCode, bookSlug, chapter);
  if (!offline) return null;
  return buildChapterContentFromHtml(offline.html, offline.bookName, chapter);
}

async function fetchChapterContent(
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

export async function getChapterContent(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent> {
  return localFirst(
    () => loadOfflineChapterContent(languageCode, bookSlug, chapter),
    () => fetchChapterContent(languageCode, bookSlug, chapter),
  );
}
