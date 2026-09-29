import { isOldTestament } from '@/constants/bible-books';

import { upsertBookCatalogRow } from './book-catalog';
import { getDb, withSerializedTransaction } from './connection';
import { upsertLanguageRow } from './languages';

/** A whole-book scripture download (`books` table) and its chapter list (`chapters`). */
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
  contentHash: string | null;
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
  contentHash?: string | null;
  chapterNumbers: number[];
  languageEnglishName?: string | null;
  languageNationalName?: string | null;
};

type BookRow = {
  id: number;
  language_code: string;
  book_slug: string;
  book_name: string;
  resource_type: string;
  content_name: string | null;
  source_url: string;
  local_path: string;
  byte_size: number;
  content_hash: string | null;
  downloaded_at: number;
};

const BOOK_COLUMNS = `id, language_code, book_slug, book_name, resource_type, content_name,
            source_url, local_path, byte_size, content_hash, downloaded_at`;

function mapBookRow(row: BookRow): BookDownloadRecord {
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
    contentHash: row.content_hash,
    downloadedAt: row.downloaded_at,
  };
}

export async function getBookDownloadRecord(
  languageCode: string,
  bookSlug: string,
): Promise<BookDownloadRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<BookRow>(
    `SELECT ${BOOK_COLUMNS}
     FROM books
     WHERE language_code = ? AND book_slug = ? COLLATE NOCASE`,
    languageCode,
    bookSlug,
  );
  return row ? mapBookRow(row) : null;
}

export async function listDownloadedBooksForLanguage(
  languageCode: string,
): Promise<BookDownloadRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<BookRow>(
      `SELECT ${BOOK_COLUMNS}
       FROM books
       WHERE language_code = ?
       ORDER BY book_slug ASC`,
      languageCode,
    );
    return rows.map(mapBookRow);
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

/** Replaces the book's download record and chapters, and adds it to the book catalog. */
export async function upsertBookWithChapters(params: UpsertBookParams): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  let bookId = 0;

  await withSerializedTransaction(db, async () => {
    await upsertLanguageRow(db, params.languageCode, {
      englishName: params.languageEnglishName,
      nationalName: params.languageNationalName,
    });

    await db.runAsync(
      'DELETE FROM books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE',
      [params.languageCode, params.bookSlug],
    );

    const insertResult = await db.runAsync(
      `INSERT INTO books (
         language_code, book_slug, book_name, resource_type, content_name,
         source_url, local_path, byte_size, content_hash, downloaded_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params.languageCode,
      params.bookSlug,
      params.bookName,
      params.resourceType,
      params.contentName,
      params.sourceUrl,
      params.localPath,
      params.byteSize,
      params.contentHash ?? null,
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

    await upsertBookCatalogRow(db, params.languageCode, {
      slug: params.bookSlug,
      name: params.bookName,
      testament: isOldTestament(params.bookSlug) ? 'old' : 'new',
    });
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
