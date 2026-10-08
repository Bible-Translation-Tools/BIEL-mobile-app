export { loadReadingTextPreferences, saveReadingTextPreferences } from './reading-text-preferences';

export { initDatabase } from './connection';

export { listLanguageCatalog, replaceLanguageCatalog } from './languages';

export {
  getBookCatalogCountsByLanguage,
  listBookCatalog,
  replaceBookCatalog,
} from './book-catalog';

export { loadChapterCatalog, saveChapterCatalog } from './chapter-catalog';

export {
  deleteBook,
  getBookDownloadRecord,
  getChapterNumbersForBook,
  getDownloadedBookCountsByLanguage,
  listDownloadedBookSlugs,
  listDownloadedBooksForLanguage,
  upsertBookWithChapters,
} from './scripture-books';

export {
  deleteScriptureChapter,
  deleteScriptureChaptersForBook,
  getScriptureChapterRecord,
  listScriptureChapterNumbersForBook,
  sumScriptureChapterByteSizeForBook,
  upsertScriptureChapter,
} from './scripture-chapters';

export {
  deleteAudioBook,
  getAudioBookRecord,
  listAudioChaptersForBook,
  listDownloadedAudioBookSlugs,
  listDownloadedAudioBooksForLanguage,
  markAudioBookComplete,
  upsertAudioBookWithChapters,
} from './audio-books';
export type { AudioChapterRecord } from './audio-books';

export { listLanguagesWithDownloads, listLocalContentBooks } from './local-content';
