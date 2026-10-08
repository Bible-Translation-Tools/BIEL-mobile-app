/** Response shapes of the BIEL GraphQL queries in `queries.ts`. Only the adapter uses these. */

export type ApiScriptureRendering = {
  book_name: string;
  book_slug?: string;
  chapter?: number | null;
  rendered_content: {
    url: string;
    hash: string | null;
    file_size_bytes: number | null;
    content: {
      name: string;
      resource_type: string;
    };
  };
};

export type ScriptureRenderingsQueryResult = {
  scriptural_rendering_metadata: ApiScriptureRendering[];
};

export type BooksQueryResult = {
  scriptural_rendering_metadata: { book_name: string; book_slug: string }[];
};

export type ChaptersQueryResult = {
  scriptural_rendering_metadata: { chapter: number | null }[];
};

export type ApiLanguage = {
  english_name: string;
  ietf_code: string;
  national_name: string | null;
  wa_language_metadata?: { is_gateway: boolean | null } | null;
  contents: { resource_type: string | null; name: string }[];
};

export type LanguagesQueryResult = {
  language: ApiLanguage[];
};

export type LanguagesWithChapterAudioQueryResult = {
  language: { ietf_code: string }[];
};

export type ApiAudioRenderedContent = {
  url: string;
  file_type: string;
  file_size_bytes: number | null;
  scriptural_rendering_metadata?: {
    chapter: number | null;
    book_slug: string;
    book_name: string;
  } | null;
};

export type AudioFilesQueryResult = {
  content: { rendered_contents: ApiAudioRenderedContent[] }[];
};
