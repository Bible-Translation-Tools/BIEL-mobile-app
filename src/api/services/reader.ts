import { catalogApi } from '@/api/catalog';
import { buildChapterContentFromHtml } from '@/api/services/chapter-html-parser';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { getOfflineChapterHtml } from '@/api/services/offline-text';
import { pickRendering } from '@/api/services/resource-selection';
import type { ChapterContent } from '@/types/reading';

async function fetchChapterContentFromNetwork(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent> {
  const data = await catalogApi.getChapterContent(languageCode, bookSlug, chapter);

  const rendering = pickRendering(data.scriptural_rendering_metadata, {
    bookSlug,
    requireChapter: true,
  });
  if (!rendering?.chapter) {
    throw new Error('Chapter not found');
  }

  const apiUrl = rendering.rendered_content.url;
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
  return buildChapterContentFromHtml(html, rendering.book_name, rendering.chapter);
}

export async function fetchChapterContent(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent> {
  try {
    return await fetchChapterContentFromNetwork(languageCode, bookSlug, chapter);
  } catch (err) {
    const offline = await getOfflineChapterHtml(languageCode, bookSlug, chapter);
    if (offline) {
      return buildChapterContentFromHtml(offline.html, offline.bookName, chapter);
    }
    throw err;
  }
}
