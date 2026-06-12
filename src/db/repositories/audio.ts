import { getDb, withSerializedTransaction } from '../connection';

export type AudioBookDownloadRecord = {
  id: number;
  languageCode: string;
  bookSlug: string;
  bookName: string;
  byteSize: number;
  downloadedAt: number;
  isComplete: boolean;
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
  isComplete?: boolean;
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
    is_complete: number;
  }>(
    `SELECT id, language_code, book_slug, book_name, byte_size, downloaded_at, is_complete
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
    isComplete: row.is_complete === 1,
  };
}

export async function listDownloadedAudioBookSlugs(languageCode: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ book_slug: string }>(
    'SELECT book_slug FROM audio_books WHERE language_code = ? AND is_complete = 1',
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
      is_complete: number;
    }>(
      `SELECT id, language_code, book_slug, book_name, byte_size, downloaded_at, is_complete
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
      isComplete: row.is_complete === 1,
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

  await withSerializedTransaction(db, async () => {
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
      `INSERT INTO audio_books (language_code, book_slug, book_name, byte_size, downloaded_at, is_complete)
       VALUES (?, ?, ?, ?, ?, ?)`,
      params.languageCode,
      params.bookSlug,
      params.bookName,
      params.byteSize,
      now,
      params.isComplete ? 1 : 0,
    );

    audioBookId = insertResult.lastInsertRowId;

    if (params.chapters.length > 0) {
      const placeholders = params.chapters.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = params.chapters.flatMap((chapter) => [
        audioBookId,
        chapter.chapterNumber,
        chapter.mp3Path,
        chapter.cuePath,
        chapter.mp3ByteSize,
        chapter.cueByteSize,
      ]);
      await db.runAsync(
        `INSERT INTO audio_chapters (
           audio_book_id, chapter_number, mp3_path, cue_path, mp3_byte_size, cue_byte_size
         ) VALUES ${placeholders}`,
        values,
      );
    }
  });

  return audioBookId;
}

export async function markAudioBookComplete(languageCode: string, bookSlug: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE audio_books SET is_complete = 1 WHERE language_code = ? AND book_slug = ? COLLATE NOCASE',
    languageCode,
    bookSlug,
  );
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
    isComplete: false,
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
    isComplete: false,
  });
}
