import type { LanguageItem } from '@/types/language';

import { getDb } from './connection';

export type LocalContentBookRecord = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  hasText: boolean;
  hasAudio: boolean;
};

type LocalContentBookRow = {
  language_code: string;
  book_slug: string;
  book_name: string;
  has_text: number;
  has_audio: number;
};

function localContentBooksSql(options: { filterByLanguage: boolean }): string {
  const where = options.filterByLanguage ? 'WHERE language_code = ?' : '';
  const orderBy = options.filterByLanguage ? 'book_slug ASC' : 'language_code ASC, book_slug ASC';

  return `SELECT
         language_code,
         book_slug,
         MAX(book_name) AS book_name,
         MAX(has_text) AS has_text,
         MAX(has_audio) AS has_audio
       FROM (
         SELECT language_code, book_slug, book_name, 1 AS has_text, 0 AS has_audio
         FROM books
         ${where}
         UNION ALL
         SELECT language_code, book_slug, book_name, 1 AS has_text, 0 AS has_audio
         FROM scripture_chapters
         ${where}
         UNION ALL
         SELECT language_code, book_slug, book_name, 0 AS has_text, 1 AS has_audio
         FROM audio_books
         ${where}
       )
       GROUP BY language_code, book_slug
       ORDER BY ${orderBy}`;
}

function mapLocalContentBookRow(row: LocalContentBookRow): LocalContentBookRecord {
  return {
    languageCode: row.language_code,
    bookSlug: row.book_slug,
    bookName: row.book_name,
    hasText: row.has_text === 1,
    hasAudio: row.has_audio === 1,
  };
}

/** Books with any local scripture (whole/chapter) or audio, across all languages. */
export async function listLocalContentBooks(): Promise<LocalContentBookRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<LocalContentBookRow>(
      localContentBooksSql({ filterByLanguage: false }),
    );
    return rows.map(mapLocalContentBookRow);
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
