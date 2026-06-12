import {
  getChapterHtmlFile,
  normalizeBookSlug,
  removeBookScriptureDirectory,
} from '@/constants/offline-storage';
import {
  deleteBook as deleteBookRecord,
  deleteScriptureChapter as deleteScriptureChapterRecord,
  deleteScriptureChaptersForBook,
  listDownloadedBookSlugs,
} from '@/db';

import { clearWholeBookCache } from './cache';

export async function deleteChapterScripture(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const htmlFile = getChapterHtmlFile(languageCode, canonicalSlug, chapter);
  if (htmlFile.exists) {
    htmlFile.delete();
  }

  await deleteScriptureChapterRecord(languageCode, canonicalSlug, chapter);
}

export async function deleteBookScripture(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  clearWholeBookCache(languageCode, canonicalSlug);

  removeBookScriptureDirectory(languageCode, canonicalSlug);

  await deleteBookRecord(languageCode, canonicalSlug);
  await deleteScriptureChaptersForBook(languageCode, canonicalSlug);
}

export async function deleteLanguageScripture(languageCode: string): Promise<void> {
  const slugs = await listDownloadedBookSlugs(languageCode);
  for (const bookSlug of slugs) {
    await deleteBookScripture(languageCode, bookSlug);
  }
}
