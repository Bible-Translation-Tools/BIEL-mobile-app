export const DATABASE_NAME = 'biel-offline.db';

export const MIGRATIONS = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );`,
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
] as const;

export const SCHEMA_VERSION = 2;

/** For databases created before book_catalog existed. */
export const MIGRATION_V2_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS book_catalog (
    language_code TEXT NOT NULL,
    book_slug TEXT NOT NULL,
    book_name TEXT NOT NULL,
    testament TEXT NOT NULL,
    PRIMARY KEY (language_code, book_slug)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_book_catalog_language ON book_catalog(language_code);`,
] as const;
