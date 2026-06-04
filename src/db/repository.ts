import * as SQLite from 'expo-sqlite';

import { isOldTestament } from '@/constants/bible-books';
import type { BookItem, Testament } from '@/types/book';
import type { LanguageItem } from '@/types/language';

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

type CachedLanguageRow = {
  ietf_code: string;
  english_name: string;
  national_name: string;
  has_text: number;
  has_audio: number;
  sort_order: number;
};

function mapCachedLanguageRow(row: CachedLanguageRow): LanguageItem {
  return {
    code: row.ietf_code,
    name: row.english_name,
    nationalName: row.national_name,
    hasText: row.has_text === 1,
    hasAudio: row.has_audio === 1,
    downloadStatus: 'pending',
  };
}

export async function replaceLanguageCatalog(languages: LanguageItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM language_catalog');
    for (const [index, language] of languages.entries()) {
      await db.runAsync(
        `INSERT INTO language_catalog (
           ietf_code, english_name, national_name, has_text, has_audio, sort_order
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        language.code,
        language.name,
        language.nationalName,
        language.hasText ? 1 : 0,
        language.hasAudio ? 1 : 0,
        index,
      );
    }
  });
}

export async function listLanguageCatalog(): Promise<LanguageItem[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<CachedLanguageRow>(
      `SELECT ietf_code, english_name, national_name, has_text, has_audio, sort_order
       FROM language_catalog
       ORDER BY sort_order ASC, english_name ASC`,
    );
    return rows.map(mapCachedLanguageRow);
  } catch {
    return [];
  }
}

/** Languages with local downloads that may not appear in the cached catalog. */
export async function listLanguagesWithDownloads(): Promise<LanguageItem[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      ietf_code: string;
      english_name: string | null;
      national_name: string | null;
      has_text: number;
      has_audio: number;
    }>(
      `SELECT
         l.ietf_code,
         l.english_name,
         l.national_name,
         CASE
           WHEN EXISTS (SELECT 1 FROM books b WHERE b.language_code = l.ietf_code)
             OR EXISTS (SELECT 1 FROM book_catalog bc WHERE bc.language_code = l.ietf_code)
             OR EXISTS (SELECT 1 FROM scripture_chapters sc WHERE sc.language_code = l.ietf_code)
           THEN 1
           ELSE 0
         END AS has_text,
         CASE
           WHEN EXISTS (SELECT 1 FROM audio_books ab WHERE ab.language_code = l.ietf_code)
           THEN 1
           ELSE 0
         END AS has_audio
       FROM languages l
       WHERE EXISTS (SELECT 1 FROM books b WHERE b.language_code = l.ietf_code)
          OR EXISTS (SELECT 1 FROM audio_books ab WHERE ab.language_code = l.ietf_code)
          OR EXISTS (SELECT 1 FROM scripture_chapters sc WHERE sc.language_code = l.ietf_code)
       ORDER BY COALESCE(l.english_name, l.ietf_code) ASC`,
    );

    return rows.map((row) => ({
      code: row.ietf_code,
      name: row.english_name?.trim() || row.ietf_code,
      nationalName: row.national_name?.trim() || row.english_name?.trim() || row.ietf_code,
      hasText: row.has_text === 1,
      hasAudio: row.has_audio === 1,
      downloadStatus: 'pending' as const,
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
  let bookId = 0;

  await db.withTransactionAsync(async () => {
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
  let audioBookId = 0;

  await db.withTransactionAsync(async () => {
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

    audioBookId = insertResult.lastInsertRowId;

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
  });

  return audioBookId;
}

export async function deleteAudioBook(languageCode: string, bookSlug: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM audio_books WHERE language_code = ? AND book_slug = ? COLLATE NOCASE',
    [languageCode, bookSlug],
  );
}

export async function mergeAudioChapter(
  languageCode: string,
  bookSlug: string,
  bookName: string,
  chapter: AudioChapterRecord,
): Promise<void> {
  const existing = await listAudioChaptersForBook(languageCode, bookSlug);
  const merged = existing.filter((item) => item.chapterNumber !== chapter.chapterNumber);
  merged.push(chapter);
  merged.sort((a, b) => a.chapterNumber - b.chapterNumber);

  const byteSize = merged.reduce(
    (sum, item) => sum + item.mp3ByteSize + item.cueByteSize,
    0,
  );

  await upsertAudioBookWithChapters({
    languageCode,
    bookSlug,
    bookName,
    byteSize,
    chapters: merged,
  });
}

export async function deleteAudioChapter(
  languageCode: string,
  bookSlug: string,
  chapterNumber: number,
): Promise<void> {
  const record = await getAudioBookRecord(languageCode, bookSlug);
  if (!record) return;

  const remaining = (await listAudioChaptersForBook(languageCode, bookSlug)).filter(
    (item) => item.chapterNumber !== chapterNumber,
  );

  if (remaining.length === 0) {
    await deleteAudioBook(languageCode, bookSlug);
    return;
  }

  const byteSize = remaining.reduce(
    (sum, item) => sum + item.mp3ByteSize + item.cueByteSize,
    0,
  );

  await upsertAudioBookWithChapters({
    languageCode,
    bookSlug,
    bookName: record.bookName,
    byteSize,
    chapters: remaining,
  });
}

export type ScriptureChapterRecord = {
  languageCode: string;
  bookSlug: string;
  chapterNumber: number;
  bookName: string;
  resourceType: string | null;
  contentName: string | null;
  sourceUrl: string;
  localPath: string;
  byteSize: number;
  downloadedAt: number;
};

export type UpsertScriptureChapterParams = {
  languageCode: string;
  bookSlug: string;
  chapterNumber: number;
  bookName: string;
  resourceType: string | null;
  contentName: string | null;
  sourceUrl: string;
  localPath: string;
  byteSize: number;
};

export async function getScriptureChapterRecord(
  languageCode: string,
  bookSlug: string,
  chapterNumber: number,
): Promise<ScriptureChapterRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    language_code: string;
    book_slug: string;
    chapter_number: number;
    book_name: string;
    resource_type: string | null;
    content_name: string | null;
    source_url: string;
    local_path: string;
    byte_size: number;
    downloaded_at: number;
  }>(
    `SELECT language_code, book_slug, chapter_number, book_name, resource_type, content_name,
            source_url, local_path, byte_size, downloaded_at
     FROM scripture_chapters
     WHERE language_code = ? AND book_slug = ? COLLATE NOCASE AND chapter_number = ?`,
    languageCode,
    bookSlug,
    chapterNumber,
  );

  if (!row) return null;

  return {
    languageCode: row.language_code,
    bookSlug: row.book_slug,
    chapterNumber: row.chapter_number,
    bookName: row.book_name,
    resourceType: row.resource_type,
    contentName: row.content_name,
    sourceUrl: row.source_url,
    localPath: row.local_path,
    byteSize: row.byte_size,
    downloadedAt: row.downloaded_at,
  };
}

export async function upsertScriptureChapter(params: UpsertScriptureChapterParams): Promise<void> {
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
    `INSERT INTO scripture_chapters (
       language_code, book_slug, chapter_number, book_name, resource_type, content_name,
       source_url, local_path, byte_size, downloaded_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(language_code, book_slug, chapter_number) DO UPDATE SET
       book_name = excluded.book_name,
       resource_type = excluded.resource_type,
       content_name = excluded.content_name,
       source_url = excluded.source_url,
       local_path = excluded.local_path,
       byte_size = excluded.byte_size,
       downloaded_at = excluded.downloaded_at`,
    params.languageCode,
    params.bookSlug,
    params.chapterNumber,
    params.bookName,
    params.resourceType,
    params.contentName,
    params.sourceUrl,
    params.localPath,
    params.byteSize,
    now,
  );
}

export async function deleteScriptureChapter(
  languageCode: string,
  bookSlug: string,
  chapterNumber: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM scripture_chapters
     WHERE language_code = ? AND book_slug = ? COLLATE NOCASE AND chapter_number = ?`,
    [languageCode, bookSlug, chapterNumber],
  );
}

export async function deleteScriptureChaptersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM scripture_chapters
     WHERE language_code = ? AND book_slug = ? COLLATE NOCASE`,
    [languageCode, bookSlug],
  );
}

export async function listScriptureChapterNumbersForBook(
  languageCode: string,
  bookSlug: string,
): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ chapter_number: number }>(
    `SELECT chapter_number
     FROM scripture_chapters
     WHERE language_code = ? AND book_slug = ? COLLATE NOCASE
     ORDER BY chapter_number ASC`,
    languageCode,
    bookSlug,
  );
  return rows.map((row) => row.chapter_number);
}
