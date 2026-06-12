import { getDb } from '../connection';

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
