import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTER_CONTENT_QUERY } from '@/api/graphql/queries';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { pickRendering } from '@/api/services/resource-selection';
import {
  ensureOfflineRootExists,
  ensureOfflineScriptureDirectory,
  getChapterHtmlFile,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import { upsertScriptureChapter } from '@/db';
import type { ChapterContentQueryResult } from '@/types/reading';

import { abortError } from '../offline/abort';
import { writeLocalTextFile } from '../offline/file-writes';
import type { DownloadProgressCallback } from './types';

export async function downloadChapterScripture(
  languageCode: string,
  bookSlug: string,
  chapter: number,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  await ensureOfflineRootExists();

  const data = await graphqlRequest<ChapterContentQueryResult>(CHAPTER_CONTENT_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata, {
    bookSlug,
    requireChapter: true,
  });

  if (!rendering?.chapter || !rendering.rendered_content.url) {
    throw new Error('Chapter content not found');
  }

  if (options?.signal?.aborted) {
    throw abortError();
  }

  options?.onProgress?.(0.1);

  const response = await fetchRenderedContent(rendering.rendered_content.url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to download chapter (${response.status})`);
  }

  const html = await response.text();
  if (options?.signal?.aborted) {
    throw abortError();
  }

  options?.onProgress?.(0.8);

  const canonicalSlug = normalizeBookSlug(bookSlug);
  ensureOfflineScriptureDirectory(languageCode, canonicalSlug);

  const htmlFile = getChapterHtmlFile(languageCode, canonicalSlug, chapter);
  const byteSize = writeLocalTextFile(html, htmlFile);

  await upsertScriptureChapter({
    languageCode,
    bookSlug: canonicalSlug,
    chapterNumber: chapter,
    bookName: rendering.book_name,
    resourceType: rendering.rendered_content.content.resource_type,
    contentName: rendering.rendered_content.content.name,
    sourceUrl: rendering.rendered_content.url,
    localPath: htmlFile.uri,
    byteSize,
  });

  options?.onProgress?.(1);
}
