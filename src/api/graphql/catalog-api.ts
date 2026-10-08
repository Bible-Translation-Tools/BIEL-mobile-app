import type { BielCatalogApi, ChapterAudioFileType } from '@/api/catalog/types';
import { graphqlRequest } from '@/api/graphql/client';
import {
  BOOK_AUDIO_FILES_QUERY,
  BOOK_CONTENT_QUERY,
  BOOKS_FOR_LANGUAGE_QUERY,
  CHAPTER_AUDIO_FILE_QUERY,
  CHAPTER_CONTENT_QUERY,
  CHAPTERS_FOR_BOOK_QUERY,
  LANGUAGE_AUDIO_FILES_QUERY,
  LANGUAGE_SCRIPTURE_FILES_QUERY,
  LANGUAGES_QUERY,
  LANGUAGES_WITH_CHAPTER_AUDIO_QUERY,
} from '@/api/graphql/queries';
import type { BookAudioFilesQueryResult, ChapterAudioQueryResult } from '@/types/audio';
import type { BooksQueryResult, ChaptersQueryResult } from '@/types/book';
import type { LanguagesQueryResult, LanguagesWithChapterAudioQueryResult } from '@/types/language';
import type { BookContentQueryResult, LanguageScriptureFilesQueryResult } from '@/types/offline';
import type { ChapterContentQueryResult } from '@/types/reading';

/** GraphQL-backed implementation of {@link BielCatalogApi}. */
export function createGraphqlCatalogApi(): BielCatalogApi {
  return {
    getLanguages() {
      return graphqlRequest<LanguagesQueryResult>(LANGUAGES_QUERY);
    },

    getLanguagesWithChapterAudio() {
      return graphqlRequest<LanguagesWithChapterAudioQueryResult>(
        LANGUAGES_WITH_CHAPTER_AUDIO_QUERY,
      );
    },

    getBooksForLanguage(languageCode: string) {
      return graphqlRequest<BooksQueryResult>(BOOKS_FOR_LANGUAGE_QUERY, { languageCode });
    },

    getChaptersForBook(languageCode: string, bookSlug: string) {
      return graphqlRequest<ChaptersQueryResult>(CHAPTERS_FOR_BOOK_QUERY, {
        languageCode,
        bookSlug,
      });
    },

    getChapterContent(languageCode: string, bookSlug: string, chapter: number) {
      return graphqlRequest<ChapterContentQueryResult>(CHAPTER_CONTENT_QUERY, {
        languageCode,
        bookSlug,
        chapter,
      });
    },

    getBookContent(languageCode: string, bookSlug: string) {
      return graphqlRequest<BookContentQueryResult>(BOOK_CONTENT_QUERY, {
        languageCode,
        bookSlug,
      });
    },

    getLanguageScriptureFiles(languageCode: string) {
      return graphqlRequest<LanguageScriptureFilesQueryResult>(LANGUAGE_SCRIPTURE_FILES_QUERY, {
        languageCode,
      });
    },

    getBookAudioFiles(languageCode: string, bookSlug: string) {
      return graphqlRequest<BookAudioFilesQueryResult>(BOOK_AUDIO_FILES_QUERY, {
        languageCode,
        bookSlug,
      });
    },

    getLanguageAudioFiles(languageCode: string) {
      return graphqlRequest<BookAudioFilesQueryResult>(LANGUAGE_AUDIO_FILES_QUERY, {
        languageCode,
      });
    },

    getChapterAudioFile(
      languageCode: string,
      bookSlug: string,
      chapter: number,
      fileType: ChapterAudioFileType,
    ) {
      return graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
        languageCode,
        bookSlug,
        chapter,
        fileType,
      });
    },
  };
}
