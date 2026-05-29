import * as SQLite from 'expo-sqlite';

import { isOldTestament } from '@/constants/bible-books';
import type { BookItem, Testament } from '@/types/book';

import { DATABASE_NAME, SCHEMA_STATEMENTS } from './schema';

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
  await db.execAsync(SCHEMA_STATEMENTS.join('\n'));
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

export async function getBookCatalogCountsByLanguage(): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{ language_code: string; count: number }>(
      'SELECT language_code, COUNT(*) AS count FROM book_catalog GROUP BY language_code',
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

export type AudioBookDownloadRecord = {
  id: number;
  languageCode: string;
  bookSlug: string;
  bookName: string;
  byteSize: number;
  downloadedAt: number;
};

export type AudioChapterRecord = {
  chapterNumber: number;
  mp3Path: string;
  cuePath: string | null;
  mp3ByteSize: number;
  cueByteSize: number;
};

export type UpsertAudioBookParams = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  byteSize: number;
  chapters: AudioChapterRecord[];
};

export async function getAudioBookRecord(
  languageCode: string,
  bookSlug: string,
): Promise<AudioBookDownloadRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    language_code: string;
    book_slug: string;
    book_name: string;
    byte_size: number;
    downloaded_at: number;
  }>(
    `SELECT id, language_code, book_slug, book_name, byte_size, downloaded_at
     FROM audio_books
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
    byteSize: row.byte_size,
    downloadedAt: row.downloaded_at,
  };
}

export async function listDownloadedAudioBookSlugs(languageCode: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ book_slug: string }>(
    'SELECT book_slug FROM audio_books WHERE language_code = ?',
    languageCode,
  );
  return rows.map((row) => row.book_slug);
}

export async function listDownloadedAudioBooksForLanguage(
  languageCode: string,
): Promise<AudioBookDownloadRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: number;
      language_code: string;
      book_slug: string;
      book_name: string;
      byte_size: number;
      downloaded_at: number;
    }>(
      `SELECT id, language_code, book_slug, book_name, byte_size, downloaded_at
       FROM audio_books
       WHERE language_code = ?
       ORDER BY book_slug ASC`,
      languageCode,
    );

    return rows.map((row) => ({
      id: row.id,
      languageCode: row.language_code,
      bookSlug: row.book_slug,
      bookName: row.book_name,
      byteSize: row.byte_size,
      downloadedAt: row.downloaded_at,
    }));
  } catch {
    return [];
  }
}

export async function listAudioChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<AudioChapterRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    chapter_number: number;
    mp3_path: string;
    cue_path: string | null;
    mp3_byte_size: number;
    cue_byte_size: number;
  }>(
    `SELECT ac.chapter_number, ac.mp3_path, ac.cue_path, ac.mp3_byte_size, ac.cue_byte_size
     FROM audio_chapters ac
     INNER JOIN audio_books ab ON ab.id = ac.audio_book_id
     WHERE ab.language_code = ? AND ab.book_slug = ? COLLATE NOCASE
     ORDER BY ac.chapter_number ASC`,
    languageCode,
    bookSlug,
  );

  return rows.map((row) => ({
    chapterNumber: row.chapter_number,
    mp3Path: row.mp3_path,
    cuePath: row.cue_path,
    mp3ByteSize: row.mp3_byte_size,
    cueByteSize: row.cue_byte_size,
  }));
}

export async function upsertAudioBookWithChapters(params: UpsertAudioBookParams): Promise<number> {
  const db = await getDb();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO languages (ietf_code, updated_at)
     VALUES (?, ?)
     ON CONFLICT(ietf_code) DO UPDATE SET updated_at = excluded.updated_at`,
    params.languageCode,
    now,
  );

  await db.runAsync(
    'DELETE FROM audio_books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE',
    [params.languageCode, params.bookSlug],
  );

  const insertResult = await db.runAsync(
    `INSERT INTO audio_books (language_code, book_slug, book_name, byte_size, downloaded_at)
     VALUES (?, ?, ?, ?, ?)`,
    params.languageCode,
    params.bookSlug,
    params.bookName,
    params.byteSize,
    now,
  );

  const audioBookId = insertResult.lastInsertRowId;

  for (const chapter of params.chapters) {
    await db.runAsync(
      `INSERT INTO audio_chapters (
         audio_book_id, chapter_number, mp3_path, cue_path, mp3_byte_size, cue_byte_size
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      audioBookId,
      chapter.chapterNumber,
      chapter.mp3Path,
      chapter.cuePath,
      chapter.mp3ByteSize,
      chapter.cueByteSize,
    );
  }

  return audioBookId;
}

export async function deleteAudioBook(languageCode: string, bookSlug: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM audio_books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE',
    [languageCode, bookSlug],
  );
}
