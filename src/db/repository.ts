import * as SQLite from 'expo-sqlite';

import { isOldTestament } from '@/constants/bible-books';
import type { BookItem, Testament } from '@/types/book';

import { DATABASE_NAME, MIGRATION_V2_STATEMENTS, MIGRATIONS, SCHEMA_VERSION } from './schema';

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

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(MIGRATIONS.join('\n'));

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1',
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    if (currentVersion < 2) {
      await db.execAsync(MIGRATION_V2_STATEMENTS.join('\n'));
    }
    if (!row) {
      await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', SCHEMA_VERSION);
    } else {
      await db.runAsync('UPDATE schema_version SET version = ?', SCHEMA_VERSION);
    }
  }
}

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

export async function replaceBookCatalog(
  languageCode: string,
  books: Pick<BookItem, 'slug' | 'name' | 'testament'>[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM book_catalog WHERE language_code = ?', languageCode);
    for (const book of books) {
      await db.runAsync(
        `INSERT INTO book_catalog (language_code, book_slug, book_name, testament)
         VALUES (?, ?, ?, ?)`,
        languageCode,
        book.slug,
        book.name,
        book.testament,
      );
    }
  });
}

export async function listBookCatalog(languageCode: string): Promise<BookItem[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      book_slug: string;
      book_name: string;
      testament: Testament;
    }>(
      `SELECT book_slug, book_name, testament
       FROM book_catalog
       WHERE language_code = ?
       ORDER BY book_slug ASC`,
      languageCode,
    );

    return rows.map((row) => ({
      id: row.book_slug,
      slug: row.book_slug,
      name: row.book_name,
      testament: row.testament,
      downloadStatus: 'pending' as const,
    }));
  } catch {
    return [];
  }
}

export async function upsertBookCatalogEntry(
  languageCode: string,
  book: Pick<BookItem, 'slug' | 'name' | 'testament'>,
): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO book_catalog (language_code, book_slug, book_name, testament)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(language_code, book_slug) DO UPDATE SET
         book_name = excluded.book_name,
         testament = excluded.testament`,
      languageCode,
      book.slug,
      book.name,
      book.testament,
    );
  } catch {
    // book_catalog may not exist before migration v2
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

  await db.runAsync('DELETE FROM books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE', [
    params.languageCode,
    params.bookSlug,
  ]);

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

  const bookId = insertResult.lastInsertRowId;

  for (const chapterNumber of params.chapterNumbers) {
    await db.runAsync(
      'INSERT INTO chapters (book_id, chapter_number) VALUES (?, ?)',
      bookId,
      chapterNumber,
    );
  }

  await upsertBookCatalogEntry(params.languageCode, {
    slug: params.bookSlug,
    name: params.bookName,
    testament: isOldTestament(params.bookSlug) ? 'old' : 'new',
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
