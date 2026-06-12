import type { BookItem, Testament } from '@/types/book';
import type { LanguageItem } from '@/types/language';

import { getDb, withSerializedTransaction } from '../connection';

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
  await withSerializedTransaction(db, async () => {
    await db.runAsync('DELETE FROM language_catalog');
    if (languages.length === 0) return;

    const placeholders = languages.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = languages.flatMap((language, index) => [
      language.code,
      language.name,
      language.nationalName,
      language.hasText ? 1 : 0,
      language.hasAudio ? 1 : 0,
      index,
    ]);
    await db.runAsync(
      `INSERT INTO language_catalog (
         ietf_code, english_name, national_name, has_text, has_audio, sort_order
       ) VALUES ${placeholders}`,
      values,
    );
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
  await withSerializedTransaction(db, async () => {
    await db.runAsync('DELETE FROM book_catalog WHERE language_code = ?', languageCode);
    if (books.length === 0) return;

    const placeholders = books.map(() => '(?, ?, ?, ?)').join(', ');
    const values = books.flatMap((book) => [
      languageCode,
      book.slug,
      book.name,
      book.testament,
    ]);
    await db.runAsync(
      `INSERT INTO book_catalog (language_code, book_slug, book_name, testament)
       VALUES ${placeholders}`,
      values,
    );
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
      audioDownloadStatus: 'pending' as const,
      hasAudio: false,
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
