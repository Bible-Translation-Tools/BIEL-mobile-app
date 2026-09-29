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
import type {
  ApiScriptureRendering,
  AudioFilesQueryResult,
  BooksQueryResult,
  ChaptersQueryResult,
  LanguagesQueryResult,
  LanguagesWithChapterAudioQueryResult,
  ScriptureRenderingsQueryResult,
} from '@/api/graphql/types';
import type { AudioFile, ScriptureRendering } from '@/types/catalog';

/** Only rendered audio under a `CONTENTS` path is the published chapter file. */
function isContentsUrl(url: string | null | undefined): url is string {
  return Boolean(url && url.includes('CONTENTS'));
}

function toScriptureRendering(rendering: ApiScriptureRendering): ScriptureRendering {
  return {
    bookSlug: rendering.book_slug ?? null,
    bookName: rendering.book_name,
    chapter: rendering.chapter ?? null,
    resourceType: rendering.rendered_content.content.resource_type,
    contentName: rendering.rendered_content.content.name,
    url: rendering.rendered_content.url,
    hash: rendering.rendered_content.hash ?? null,
    fileSizeBytes: rendering.rendered_content.file_size_bytes ?? null,
  };
}

function toScriptureRenderings(data: ScriptureRenderingsQueryResult): ScriptureRendering[] {
  return data.scriptural_rendering_metadata.map(toScriptureRendering);
}

function toAudioFiles(data: AudioFilesQueryResult): AudioFile[] {
  return data.content.flatMap((content) =>
    content.rendered_contents.flatMap((rendered): AudioFile[] => {
      if (!isContentsUrl(rendered.url)) return [];
      const meta = rendered.scriptural_rendering_metadata;
      return [
        {
          url: rendered.url,
          fileType: rendered.file_type?.toLowerCase() ?? '',
          fileSizeBytes: rendered.file_size_bytes ?? null,
          chapter: meta?.chapter ?? null,
          bookSlug: meta?.book_slug ?? null,
          bookName: meta?.book_name ?? null,
        },
      ];
    }),
  );
}

/** GraphQL-backed implementation of {@link BielCatalogApi}. */
export function createGraphqlCatalogApi(): BielCatalogApi {
  return {
    async getLanguages() {
      const data = await graphqlRequest<LanguagesQueryResult>(LANGUAGES_QUERY);
      return data.language.map((language) => ({
        code: language.ietf_code,
        englishName: language.english_name,
        nationalName: language.national_name,
        resourceTypes: language.contents
          .map((content) => content.resource_type)
          .filter((type): type is string => Boolean(type)),
      }));
    },

    async getLanguageCodesWithChapterAudio() {
      const data = await graphqlRequest<LanguagesWithChapterAudioQueryResult>(
        LANGUAGES_WITH_CHAPTER_AUDIO_QUERY,
      );
      return data.language.map((language) => language.ietf_code);
    },

    async getBooksForLanguage(languageCode: string) {
      const data = await graphqlRequest<BooksQueryResult>(BOOKS_FOR_LANGUAGE_QUERY, {
        languageCode,
      });
      return data.scriptural_rendering_metadata.map((book) => ({
        bookSlug: book.book_slug,
        bookName: book.book_name,
      }));
    },

    async getChapterNumbersForBook(languageCode: string, bookSlug: string) {
      const data = await graphqlRequest<ChaptersQueryResult>(CHAPTERS_FOR_BOOK_QUERY, {
        languageCode,
        bookSlug,
      });
      return data.scriptural_rendering_metadata
        .map((item) => item.chapter)
        .filter((chapter): chapter is number => chapter != null);
    },

    async getChapterRenderings(languageCode: string, bookSlug: string, chapter: number) {
      return toScriptureRenderings(
        await graphqlRequest<ScriptureRenderingsQueryResult>(CHAPTER_CONTENT_QUERY, {
          languageCode,
          bookSlug,
          chapter,
        }),
      );
    },

    async getBookRenderings(languageCode: string, bookSlug: string) {
      return toScriptureRenderings(
        await graphqlRequest<ScriptureRenderingsQueryResult>(BOOK_CONTENT_QUERY, {
          languageCode,
          bookSlug,
        }),
      );
    },

    async getLanguageScriptureRenderings(languageCode: string) {
      return toScriptureRenderings(
        await graphqlRequest<ScriptureRenderingsQueryResult>(LANGUAGE_SCRIPTURE_FILES_QUERY, {
          languageCode,
        }),
      );
    },

    async getBookAudioFiles(languageCode: string, bookSlug: string) {
      return toAudioFiles(
        await graphqlRequest<AudioFilesQueryResult>(BOOK_AUDIO_FILES_QUERY, {
          languageCode,
          bookSlug,
        }),
      );
    },

    async getLanguageAudioFiles(languageCode: string) {
      return toAudioFiles(
        await graphqlRequest<AudioFilesQueryResult>(LANGUAGE_AUDIO_FILES_QUERY, {
          languageCode,
        }),
      );
    },

    async getChapterAudioFiles(
      languageCode: string,
      bookSlug: string,
      chapter: number,
      fileType: ChapterAudioFileType,
    ) {
      return toAudioFiles(
        await graphqlRequest<AudioFilesQueryResult>(CHAPTER_AUDIO_FILE_QUERY, {
          languageCode,
          bookSlug,
          chapter,
          fileType,
        }),
      );
    },
  };
}
