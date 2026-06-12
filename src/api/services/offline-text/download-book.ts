import { File } from 'expo-file-system';

import { fetchRenderedContent } from '@/api/services/content-fetch';
import { extractChapterNumbersFromWholeBookJson } from '@/api/services/whole-book-parser';
import { isAbortError } from '@/utils/run-with-concurrency';
import { yieldToUi } from '@/utils/yield-to-ui';

import {
  ensureOfflineRootExists,
  ensureOfflineScriptureDirectory,
  getWholeJsonFile,
  normalizeBookSlug,
  removeBookScriptureDirectory,
} from '@/constants/offline-storage';
import { upsertBookWithChapters } from '@/db';

import { abortError } from '../offline/abort';
import { clearWholeBookCache } from './cache';
import { resolveBookContent } from './resolve';
import type { DownloadProgressCallback } from './types';

export async function downloadBookScripture(
  languageCode: string,
  bookSlug: string,
  options?: {
    onProgress?: DownloadProgressCallback;
    signal?: AbortSignal;
  },
): Promise<void> {
  await ensureOfflineRootExists();

  const canonicalSlug = normalizeBookSlug(bookSlug);
  let completed = false;

  try {
    const resolved = await resolveBookContent(languageCode, bookSlug);
    if (options?.signal?.aborted) {
      throw abortError();
    }

    options?.onProgress?.(0.1);

    const response = await fetchRenderedContent(resolved.url, {
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to download book (${response.status})`);
    }

    const jsonText = (await response.text()).trim();
    if (options?.signal?.aborted) {
      throw abortError();
    }

    options?.onProgress?.(0.6);

    await yieldToUi();

    let payload: unknown;
    try {
      payload = JSON.parse(jsonText) as unknown;
    } catch {
      const preview = jsonText.slice(0, 80);
      if (preview.startsWith('<')) {
        throw new Error('Download returned HTML instead of book data');
      }
      if (preview.startsWith('\\id ')) {
        throw new Error('Received USFM text instead of whole.json');
      }
      throw new Error('Downloaded book data is not valid JSON');
    }

    await yieldToUi();

    const chapterNumbers = extractChapterNumbersFromWholeBookJson(payload);
    if (chapterNumbers.length === 0) {
      throw new Error('Downloaded book has no chapters');
    }

    ensureOfflineScriptureDirectory(languageCode, canonicalSlug);

    const bookJsonFile = getWholeJsonFile(languageCode, canonicalSlug);
    const tempFile = new File(bookJsonFile.parentDirectory, 'whole.json.tmp');
    if (tempFile.exists) {
      tempFile.delete();
    }
    tempFile.write(jsonText);
    if (bookJsonFile.exists) {
      bookJsonFile.delete();
    }
    tempFile.move(bookJsonFile);

    clearWholeBookCache(languageCode, canonicalSlug);

    options?.onProgress?.(0.9);

    await yieldToUi();

    const byteSize = jsonText.length;

    await upsertBookWithChapters({
      languageCode,
      bookSlug: canonicalSlug,
      bookName: resolved.bookName,
      resourceType: resolved.resourceType,
      contentName: resolved.contentName,
      sourceUrl: resolved.url,
      localPath: bookJsonFile.uri,
      byteSize,
      chapterNumbers,
    });

    completed = true;
    options?.onProgress?.(1);
  } catch (err) {
    if (isAbortError(err)) {
      if (!completed) {
        removeBookScriptureDirectory(languageCode, canonicalSlug);
      }
      return;
    }
    throw err;
  }
}
