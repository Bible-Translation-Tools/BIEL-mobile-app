import type * as SQLite from 'expo-sqlite';

import type { LanguageItem } from '@/types/language';

import { getDb, withSerializedTransaction } from './connection';

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

/**
 * Ensures the `languages` row that downloads reference exists.
 * Missing names keep whatever is already stored.
 */
export async function upsertLanguageRow(
  db: SQLite.SQLiteDatabase,
  languageCode: string,
  names?: { englishName?: string | null; nationalName?: string | null },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO languages (ietf_code, english_name, national_name, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(ietf_code) DO UPDATE SET
       english_name = COALESCE(excluded.english_name, languages.english_name),
       national_name = COALESCE(excluded.national_name, languages.national_name),
       updated_at = excluded.updated_at`,
    languageCode,
    names?.englishName ?? null,
    names?.nationalName ?? null,
    Date.now(),
  );
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
