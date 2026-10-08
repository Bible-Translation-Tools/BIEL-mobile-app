import type { BookAudioFilesQueryResult, ChapterAudioQueryResult } from '@/types/audio';
import type { BooksQueryResult, ChaptersQueryResult } from '@/types/book';
import type { LanguagesQueryResult, LanguagesWithChapterAudioQueryResult } from '@/types/language';
import type { BookContentQueryResult, LanguageScriptureFilesQueryResult } from '@/types/offline';
import type { ChapterContentQueryResult } from '@/types/reading';

export type ChapterAudioFileType = 'mp3' | 'cue';

/**
 * Catalog Interface. Transport-agnostic so GraphQL can be
 * swapped for REST or another API without changing services.
 */
export type BielCatalogApi = {
  getLanguages(): Promise<LanguagesQueryResult>;
  getLanguagesWithChapterAudio(): Promise<LanguagesWithChapterAudioQueryResult>;
  getBooksForLanguage(languageCode: string): Promise<BooksQueryResult>;
  getChaptersForBook(languageCode: string, bookSlug: string): Promise<ChaptersQueryResult>;
  getChapterContent(
    languageCode: string,
    bookSlug: string,
    chapter: number,
  ): Promise<ChapterContentQueryResult>;
  getBookContent(languageCode: string, bookSlug: string): Promise<BookContentQueryResult>;
  getLanguageScriptureFiles(languageCode: string): Promise<LanguageScriptureFilesQueryResult>;
  getBookAudioFiles(languageCode: string, bookSlug: string): Promise<BookAudioFilesQueryResult>;
  getLanguageAudioFiles(languageCode: string): Promise<BookAudioFilesQueryResult>;
  getChapterAudioFile(
    languageCode: string,
    bookSlug: string,
    chapter: number,
    fileType: ChapterAudioFileType,
  ): Promise<ChapterAudioQueryResult>;
};
