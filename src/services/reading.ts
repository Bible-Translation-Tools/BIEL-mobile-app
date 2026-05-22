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

const CHAPTER_HTML_API = 'https://read.bibleineverylanguage.org/api/getHtmlForChap';
const RESOURCE_PRIORITY = ['udb', 'ulb', 'reg'] as const;
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

function parseContentRepo(contentName: string): { user: string; repo: string } {
  const [namespacePart, resourcePart] = contentName.split('/');
  const user =
    namespacePart?.toLowerCase() === 'wa-catalog' ? 'WA-Catalog' : (namespacePart ?? 'WA-Catalog');
  const repo = resourcePart ?? contentName;

  return { user, repo };
}

function buildChapterHtmlApiUrl(
  contentName: string,
  bookSlug: string,
  chapter: number,
): string {
  const { user, repo } = parseContentRepo(contentName);
  const params = new URLSearchParams({
    user,
    repo,
    book: bookSlug.toUpperCase(),
    chapter: String(chapter),
  });

  return `${CHAPTER_HTML_API}?${params.toString()}`;
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

function parseVersesFromParagraph(paragraphHtml: string): ScriptureVerse[] {
  const verses: ScriptureVerse[] = [];
  const verseRegex =
    /<span class="verse">\s*<sup class="versemarker">(\d+)<\/sup>\s*([\s\S]*?)<\/span>/gi;

  let match = verseRegex.exec(paragraphHtml);
  while (match) {
    const text = stripTags(match[2]);
    if (text) {
      verses.push({ number: Number.parseInt(match[1], 10), text });
    }
    match = verseRegex.exec(paragraphHtml);
  }

  return verses;
}

export function parseChapterHtml(html: string): ScriptureSection[] {
  const chapterMatch = html.match(/class="chapter"[^>]*>([\s\S]*)/i);
  if (!chapterMatch) return [];

  const chapterHtml = chapterMatch[1];
  const sections: ScriptureSection[] = [];
  let currentSection: ScriptureSection = { paragraphs: [] };

  const blockRegex = /<(p|h[1-6])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let blockMatch = blockRegex.exec(chapterHtml);

  while (blockMatch) {
    const tag = blockMatch[1].toLowerCase();
    const innerHtml = blockMatch[2];
    const verses = parseVersesFromParagraph(innerHtml);

    if (verses.length > 0) {
      currentSection.paragraphs.push({ verses });
    } else if (/^h[1-6]$/.test(tag)) {
      const heading = stripTags(innerHtml);
      if (heading) {
        if (currentSection.paragraphs.length > 0 || currentSection.heading) {
          sections.push(currentSection);
          currentSection = { paragraphs: [] };
        }
        currentSection.heading = heading;
      }
    } else {
      const text = stripTags(innerHtml);
      if (text && !currentSection.heading) {
        currentSection.heading = text;
      }
    }

    blockMatch = blockRegex.exec(chapterHtml);
  }

  if (currentSection.paragraphs.length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    const verses = parseVersesFromParagraph(chapterHtml);
    if (verses.length > 0) {
      sections.push({ paragraphs: [{ verses }] });
    }
  }

  return sections;
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

  const apiUrl = buildChapterHtmlApiUrl(
    rendering.rendered_content.content.name,
    bookSlug,
    chapter,
  );

  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  });

  if (!response.ok) {
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
