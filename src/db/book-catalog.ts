import type * as SQLite from 'expo-sqlite';

import type { BookItem, Testament } from '@/types/book';

import { getDb, withSerializedTransaction } from './connection';

type CatalogBook = Pick<BookItem, 'slug' | 'name' | 'testament'>;

export async function upsertBookCatalogRow(
  db: SQLite.SQLiteDatabase,
  languageCode: string,
  book: CatalogBook,
): Promise<void> {
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

export async function replaceBookCatalog(
  languageCode: string,
  books: CatalogBook[],
): Promise<void> {
  const db = await getDb();
  await withSerializedTransaction(db, async () => {
    await db.runAsync('DELETE FROM book_catalog WHERE language_code = ?', languageCode);
    if (books.length === 0) return;

    const placeholders = books.map(() => '(?, ?, ?, ?)').join(', ');
    const values = books.flatMap((book) => [languageCode, book.slug, book.name, book.testament]);
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
