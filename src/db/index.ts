export {
  loadAppearancePreference,
  saveAppearancePreference,
} from './appearance-preferences';
export {
  clearReadingTextPreferences,
  loadReadingTextPreferences,
  saveReadingTextPreferences,
} from './reading-text-preferences';
export type { ReadingTextPreferenceLevels } from './reading-text-preferences';
export { deletePreference, getPreference, setPreference } from './preferences';

export { initDatabase } from './connection';

export { listLanguageCatalog, replaceLanguageCatalog } from './languages';

export {
  getBookCatalogCountsByLanguage,
  listBookCatalog,
  replaceBookCatalog,
  upsertBookCatalogEntry,
} from './book-catalog';

export { loadChapterCatalog, saveChapterCatalog } from './chapter-catalog';
export type { ChapterCatalogContentType } from './chapter-catalog';

export {
  deleteBook,
  getBookDownloadRecord,
  getChapterNumbersForBook,
  getDownloadedBookCountsByLanguage,
  listDownloadedBookSlugs,
  listDownloadedBooksForLanguage,
  upsertBookWithChapters,
} from './scripture-books';
export type { BookDownloadRecord, UpsertBookParams } from './scripture-books';

export {
  deleteScriptureChapter,
  deleteScriptureChaptersForBook,
  getScriptureChapterRecord,
  listScriptureChapterNumbersForBook,
  sumScriptureChapterByteSizeForBook,
  upsertScriptureChapter,
} from './scripture-chapters';
export type { ScriptureChapterRecord, UpsertScriptureChapterParams } from './scripture-chapters';

export {
  deleteAudioBook,
  getAudioBookRecord,
  listAudioChaptersForBook,
  listDownloadedAudioBookSlugs,
  listDownloadedAudioBooksForLanguage,
  markAudioBookComplete,
  upsertAudioBookWithChapters,
} from './audio-books';
export type {
  AudioBookDownloadRecord,
  AudioChapterRecord,
  UpsertAudioBookParams,
} from './audio-books';

export {
  listLanguagesWithDownloads,
  listLocalContentBooks,
  listLocalContentBooksForLanguage,
} from './local-content';
export type { LocalContentBookRecord } from './local-content';
