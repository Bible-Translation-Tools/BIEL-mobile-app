import { getDb } from './connection';

export type ChapterCatalogContentType = 'text' | 'audio';

/** Cached chapter numbers for a book, or `null` when none are cached. */
export async function loadChapterCatalog(
  languageCode: string,
  bookSlug: string,
  contentType: ChapterCatalogContentType,
): Promise<number[] | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ chapter_numbers: string }>(
      `SELECT chapter_numbers
       FROM chapter_catalog
       WHERE language_code = ? AND book_slug = ? AND content_type = ?`,
      languageCode,
      bookSlug,
      contentType,
    );
    if (!row) return null;

    const parsed: unknown = JSON.parse(row.chapter_numbers);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((value): value is number => typeof value === 'number');
  } catch {
    return null;
  }
}

export async function saveChapterCatalog(
  languageCode: string,
  bookSlug: string,
  contentType: ChapterCatalogContentType,
  chapterNumbers: number[],
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO chapter_catalog (language_code, book_slug, content_type, chapter_numbers)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(language_code, book_slug, content_type) DO UPDATE SET
       chapter_numbers = excluded.chapter_numbers`,
    languageCode,
    bookSlug,
    contentType,
    JSON.stringify(chapterNumbers),
  );
}
