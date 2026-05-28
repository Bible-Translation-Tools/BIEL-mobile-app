export {
  deleteBook,
  getBookDownloadRecord,
  getChapterNumbersForBook,
  initDatabase,
  listBookCatalog,
  listDownloadedBookSlugs,
  listDownloadedBooksForLanguage,
  replaceBookCatalog,
  upsertBookCatalogEntry,
  upsertBookWithChapters,
} from './repository';
export type { BookDownloadRecord, UpsertBookParams } from './repository';
