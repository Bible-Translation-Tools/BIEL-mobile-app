import { graphqlRequest } from '@/api/graphql/client';
import {
  BOOK_CONTENT_QUERY,
  LANGUAGE_SCRIPTURE_FILES_QUERY,
} from '@/api/graphql/queries';
import { pickRendering } from '@/api/services/resource-selection';
import { normalizeBookSlug } from '@/constants/offline-storage';
import type {
  ApiBookContentRendering,
  BookContentQueryResult,
  LanguageScriptureFilesQueryResult,
  ResolvedBookContent,
} from '@/types/offline';

/** Dedupes overlapping LANGUAGE_SCRIPTURE_FILES_QUERY requests per language code. */
const languageScriptureFilesInflight = new Map<string, Promise<LanguageScriptureFilesQueryResult>>();

export async function resolveBookContent(
  languageCode: string,
  bookSlug: string,
): Promise<ResolvedBookContent> {
  const data = await graphqlRequest<BookContentQueryResult>(BOOK_CONTENT_QUERY, {
    languageCode,
    bookSlug,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata, { bookSlug });
  if (!rendering?.rendered_content.url) {
    throw new Error('Book content not found');
  }

  return {
    bookName: rendering.book_name,
    bookSlug: rendering.book_slug,
    url: rendering.rendered_content.url,
    resourceType: rendering.rendered_content.content.resource_type,
    contentName: rendering.rendered_content.content.name,
    fileSizeBytes: rendering.rendered_content.file_size_bytes,
  };
}

export async function getBookScriptureFileSizeBytes(
  languageCode: string,
  bookSlug: string,
): Promise<number> {
  const resolved = await resolveBookContent(languageCode, bookSlug);
  return resolved.fileSizeBytes;
}

export async function fetchLanguageScriptureFiles(
  languageCode: string,
): Promise<LanguageScriptureFilesQueryResult> {
  const key = languageCode.toUpperCase();
  const inflight = languageScriptureFilesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = graphqlRequest<LanguageScriptureFilesQueryResult>(
    LANGUAGE_SCRIPTURE_FILES_QUERY,
    { languageCode },
  ).finally(() => {
    languageScriptureFilesInflight.delete(key);
  });
  languageScriptureFilesInflight.set(key, request);
  return request;
}

function groupScriptureRenderingsByBookSlug(
  renderings: ApiBookContentRendering[],
): Map<string, ApiBookContentRendering[]> {
  const bySlug = new Map<string, ApiBookContentRendering[]>();

  for (const rendering of renderings) {
    const slug = normalizeBookSlug(rendering.book_slug);
    const grouped = bySlug.get(slug) ?? [];
    grouped.push(rendering);
    bySlug.set(slug, grouped);
  }

  return bySlug;
}

export function parseLanguageScriptureBytesBySlug(
  data: LanguageScriptureFilesQueryResult,
): Map<string, number> {
  const bytesBySlug = new Map<string, number>();

  for (const [bookSlug, renderings] of groupScriptureRenderingsByBookSlug(
    data.scriptural_rendering_metadata,
  )) {
    const rendering = pickRendering(renderings, { bookSlug });
    if (rendering?.rendered_content.file_size_bytes != null) {
      bytesBySlug.set(bookSlug, rendering.rendered_content.file_size_bytes);
    }
  }

  return bytesBySlug;
}
