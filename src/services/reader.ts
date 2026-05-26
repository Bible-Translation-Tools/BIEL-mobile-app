import { graphqlRequest } from '@/lib/graphql/client';
import { CHAPTER_CONTENT_QUERY } from '@/lib/graphql/queries';
import type {
  ApiChapterRendering,
  ChapterContent,
  ChapterContentQueryResult,
  ScriptureParagraph,
  ScriptureSection,
  ScriptureVerse,
} from '@/types/reading';

const RESOURCE_PRIORITY = ['ulb', 'udb', 'reg'] as const;
const EXCLUDED_RESOURCE_TYPES = new Set(['tq', 'tn']);

function pickRendering(
  renderings: ApiChapterRendering[],
): ApiChapterRendering | null {
  const candidates = renderings.filter(
    (item) =>
      item.chapter != null &&
      !EXCLUDED_RESOURCE_TYPES.has(item.rendered_content.content.resource_type),
  );

  if (candidates.length === 0) return null;

  for (const resourceType of RESOURCE_PRIORITY) {
    const match = candidates.find(
      (item) => item.rendered_content.content.resource_type === resourceType,
    );
    if (match) return match;
  }

  return candidates[0] ?? null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

/** Strip empty <p></p> tags nested inside verses — they break naive paragraph matching. */
function cleanChapterHtml(html: string): string {
  return html.replace(/<p>\s*<\/p>/gi, '');
}

function parseAllVerses(html: string): ScriptureVerse[] {
  const cleaned = cleanChapterHtml(html);
  const verses: ScriptureVerse[] = [];
  const verseRegex =
    /<span class="verse">\s*<sup class="versemarker">(\d+)<\/sup>\s*([\s\S]*?)<\/span>/gi;

  let match = verseRegex.exec(cleaned);
  while (match) {
    const text = stripTags(match[2]);
    if (text) {
      verses.push({ number: Number.parseInt(match[1], 10), text });
    }
    match = verseRegex.exec(cleaned);
  }

  return verses;
}

function groupVersesIntoParagraphs(chapterHtml: string): ScriptureParagraph[] {
  const cleaned = cleanChapterHtml(chapterHtml);
  const chunks = cleaned.split(/<\/p>\s*<p(?:\s[^>]*)?>/i);
  const paragraphs: ScriptureParagraph[] = [];

  for (const chunk of chunks) {
    const verses = parseAllVerses(chunk);
    if (verses.length > 0) {
      paragraphs.push({ verses });
    }
  }

  if (paragraphs.length === 0) {
    const verses = parseAllVerses(cleaned);
    if (verses.length > 0) {
      paragraphs.push({ verses });
    }
  }

  return paragraphs;
}

function parseSectionHeadings(chapterHtml: string): string[] {
  const headings: string[] = [];
  const headingRegex = /<h[1-6](?:\s[^>]*)?>([\s\S]*?)<\/h[1-6]>/gi;

  let match = headingRegex.exec(chapterHtml);
  while (match) {
    const heading = stripTags(match[1]);
    if (heading) headings.push(heading);
    match = headingRegex.exec(chapterHtml);
  }

  return headings;
}

export function parseChapterHtml(html: string): ScriptureSection[] {
  const chapterMatch = html.match(/class="chapter"[^>]*>([\s\S]*)/i);
  if (!chapterMatch) return [];

  const chapterHtml = chapterMatch[1];
  const paragraphs = groupVersesIntoParagraphs(chapterHtml);

  if (paragraphs.length === 0) return [];

  const headings = parseSectionHeadings(chapterHtml);

  if (headings.length === 0) {
    return [{ paragraphs }];
  }

  return [{ heading: headings[0], paragraphs }];
}

export async function fetchChapterContent(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<ChapterContent> {
  const data = await graphqlRequest<ChapterContentQueryResult>(CHAPTER_CONTENT_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata);
  if (!rendering?.chapter) {
    throw new Error('Chapter not found');
  }

  const apiUrl = rendering.rendered_content.url;
  if (!apiUrl) {
    throw new Error('Chapter rendered URL is missing');
  }

  const response = await fetch(apiUrl, {
    headers: { Accept: 'text/html' },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn('[reader] chapter fetch failed', {
      apiUrl,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: errorBody.slice(0, 300),
    });
    throw new Error(`Failed to load chapter (${response.status})`);
  }

  const html = await response.text();

  const sections = parseChapterHtml(html);

  if (sections.every((section) => section.paragraphs.length === 0)) {
    throw new Error('Chapter content is empty');
  }

  return {
    bookName: rendering.book_name,
    chapter: rendering.chapter,
    sections,
  };
}
