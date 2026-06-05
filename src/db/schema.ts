export const DATABASE_NAME = 'biel-offline.db';

export const SCHEMA_STATEMENTS = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS languages (
    ietf_code TEXT PRIMARY KEY NOT NULL,
    english_name TEXT,
    national_name TEXT,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code TEXT NOT NULL,
    book_slug TEXT NOT NULL,
    book_name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    content_name TEXT,
    source_url TEXT NOT NULL,
    local_path TEXT NOT NULL,
    byte_size INTEGER NOT NULL DEFAULT 0,
    downloaded_at INTEGER NOT NULL,
    UNIQUE(language_code, book_slug),
    FOREIGN KEY (language_code) REFERENCES languages(ietf_code) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,
    UNIQUE(book_id, chapter_number),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_books_language ON books(language_code);`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);`,
  `CREATE TABLE IF NOT EXISTS book_catalog (
    language_code TEXT NOT NULL,
    book_slug TEXT NOT NULL,
    book_name TEXT NOT NULL,
    testament TEXT NOT NULL,
    PRIMARY KEY (language_code, book_slug)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_book_catalog_language ON book_catalog(language_code);`,
  `CREATE TABLE IF NOT EXISTS language_catalog (
    ietf_code TEXT PRIMARY KEY NOT NULL,
    english_name TEXT NOT NULL,
    national_name TEXT NOT NULL,
    has_text INTEGER NOT NULL DEFAULT 0,
    has_audio INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS audio_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code TEXT NOT NULL,
    book_slug TEXT NOT NULL,
    book_name TEXT NOT NULL,
    byte_size INTEGER NOT NULL DEFAULT 0,
    downloaded_at INTEGER NOT NULL,
    UNIQUE(language_code, book_slug),
    FOREIGN KEY (language_code) REFERENCES languages(ietf_code) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS audio_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audio_book_id INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,
    mp3_path TEXT NOT NULL,
    cue_path TEXT,
    mp3_byte_size INTEGER NOT NULL DEFAULT 0,
    cue_byte_size INTEGER NOT NULL DEFAULT 0,
    UNIQUE(audio_book_id, chapter_number),
    FOREIGN KEY (audio_book_id) REFERENCES audio_books(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_audio_books_language ON audio_books(language_code);`,
  `CREATE INDEX IF NOT EXISTS idx_audio_chapters_book ON audio_chapters(audio_book_id);`,
  `CREATE TABLE IF NOT EXISTS scripture_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code TEXT NOT NULL,
    book_slug TEXT NOT NULL,
    chapter_number INTEGER NOT NULL,
    book_name TEXT NOT NULL,
    resource_type TEXT,
    content_name TEXT,
    source_url TEXT NOT NULL,
    local_path TEXT NOT NULL,
    byte_size INTEGER NOT NULL DEFAULT 0,
    downloaded_at INTEGER NOT NULL,
    UNIQUE(language_code, book_slug, chapter_number),
    FOREIGN KEY (language_code) REFERENCES languages(ietf_code) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_scripture_chapters_book ON scripture_chapters(language_code, book_slug);`,
  `CREATE TABLE IF NOT EXISTS preferences (
    "key" TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,
] as const;
