import { isOldTestament } from '@/constants/bible-books';

import { getDb, withSerializedTransaction } from '../connection';

export type BookDownloadRecord = {
  id: number;
  languageCode: string;
  bookSlug: string;
  bookName: string;
  resourceType: string;
  contentName: string | null;
  sourceUrl: string;
  localPath: string;
  byteSize: number;
  downloadedAt: number;
};

export type UpsertBookParams = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  resourceType: string;
  contentName: string | null;
  sourceUrl: string;
  localPath: string;
  byteSize: number;
  chapterNumbers: number[];
  languageEnglishName?: string | null;
  languageNationalName?: string | null;
};

export async function getBookDownloadRecord(
  languageCode: string,
  bookSlug: string,
): Promise<BookDownloadRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    language_code: string;
    book_slug: string;
    book_name: string;
    resource_type: string;
    content_name: string | null;
    source_url: string;
    local_path: string;
    byte_size: number;
    downloaded_at: number;
  }>(
    `SELECT id, language_code, book_slug, book_name, resource_type, content_name,
            source_url, local_path, byte_size, downloaded_at
     FROM books
     WHERE language_code = ? AND book_slug = ? COLLATE NOCASE`,
    languageCode,
    bookSlug,
  );

  if (!row) return null;

  return {
    id: row.id,
    languageCode: row.language_code,
    bookSlug: row.book_slug,
    bookName: row.book_name,
    resourceType: row.resource_type,
    contentName: row.content_name,
    sourceUrl: row.source_url,
    localPath: row.local_path,
    byteSize: row.byte_size,
    downloadedAt: row.downloaded_at,
  };
}

export async function listDownloadedBooksForLanguage(
  languageCode: string,
): Promise<BookDownloadRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
    id: number;
    language_code: string;
    book_slug: string;
    book_name: string;
    resource_type: string;
    content_name: string | null;
    source_url: string;
    local_path: string;
    byte_size: number;
    downloaded_at: number;
  }>(
    `SELECT id, language_code, book_slug, book_name, resource_type, content_name,
            source_url, local_path, byte_size, downloaded_at
     FROM books
     WHERE language_code = ?
     ORDER BY book_slug ASC`,
    languageCode,
  );

    return rows.map((row) => ({
      id: row.id,
      languageCode: row.language_code,
      bookSlug: row.book_slug,
      bookName: row.book_name,
      resourceType: row.resource_type,
      contentName: row.content_name,
      sourceUrl: row.source_url,
      localPath: row.local_path,
      byteSize: row.byte_size,
      downloadedAt: row.downloaded_at,
    }));
  } catch {
    return [];
  }
}

export async function listDownloadedBookSlugs(languageCode: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ book_slug: string }>(
    'SELECT book_slug FROM books WHERE language_code = ?',
    languageCode,
  );
  return rows.map((row) => row.book_slug);
}

export async function getDownloadedBookCountsByLanguage(): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{ language_code: string; count: number }>(
      'SELECT language_code, COUNT(*) AS count FROM books GROUP BY language_code',
    );
    return Object.fromEntries(rows.map((row) => [row.language_code, row.count]));
  } catch {
    return {};
  }
}

export async function getChapterNumbersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ chapter_number: number }>(
    `SELECT c.chapter_number
     FROM chapters c
     INNER JOIN books b ON b.id = c.book_id
     WHERE b.language_code = ? AND b.book_slug = ? COLLATE NOCASE
     ORDER BY c.chapter_number ASC`,
    languageCode,
    bookSlug,
  );
  return rows.map((row) => row.chapter_number);
}

export async function upsertBookWithChapters(params: UpsertBookParams): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  let bookId = 0;

  await withSerializedTransaction(db, async () => {
    await db.runAsync(
      `INSERT INTO languages (ietf_code, english_name, national_name, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(ietf_code) DO UPDATE SET
         english_name = COALESCE(excluded.english_name, languages.english_name),
         national_name = COALESCE(excluded.national_name, languages.national_name),
         updated_at = excluded.updated_at`,
      params.languageCode,
      params.languageEnglishName ?? null,
      params.languageNationalName ?? null,
      now,
    );

    await db.runAsync(
      'DELETE FROM books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE',
      [params.languageCode, params.bookSlug],
    );

    const insertResult = await db.runAsync(
      `INSERT INTO books (
         language_code, book_slug, book_name, resource_type, content_name,
         source_url, local_path, byte_size, downloaded_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params.languageCode,
      params.bookSlug,
      params.bookName,
      params.resourceType,
      params.contentName,
      params.sourceUrl,
      params.localPath,
      params.byteSize,
      now,
    );

    bookId = insertResult.lastInsertRowId;

    if (params.chapterNumbers.length > 0) {
      const placeholders = params.chapterNumbers.map(() => '(?, ?)').join(', ');
      const values = params.chapterNumbers.flatMap((chapterNumber) => [bookId, chapterNumber]);
      await db.runAsync(
        `INSERT INTO chapters (book_id, chapter_number) VALUES ${placeholders}`,
        values,
      );
    }

    await db.runAsync(
      `INSERT INTO book_catalog (language_code, book_slug, book_name, testament)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(language_code, book_slug) DO UPDATE SET
         book_name = excluded.book_name,
         testament = excluded.testament`,
      params.languageCode,
      params.bookSlug,
      params.bookName,
      isOldTestament(params.bookSlug) ? 'old' : 'new',
    );
  });

  return bookId;
}

export async function deleteBook(languageCode: string, bookSlug: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE', [
    languageCode,
    bookSlug,
  ]);
}
