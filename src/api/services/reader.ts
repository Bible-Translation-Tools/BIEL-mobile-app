import { graphqlRequest } from '@/api/graphql/client';
import { CHAPTER_CONTENT_QUERY } from '@/api/graphql/queries';
import { fetchRenderedContent } from '@/api/services/content-fetch';
import { getOfflineChapterHtml } from '@/api/services/offline-text';
import { pickRendering } from '@/api/services/resource-selection';
import type {
  ChapterContent,
  ChapterContentQueryResult,
  ScriptureFootnote,
  ScriptureInlinePart,
  ScriptureLine,
  ScriptureParagraph,
  ScriptureSection,
  ScriptureVerse,
} from '@/types/reading';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

/** Strip empty <p></p> tags nested inside verses — they break naive paragraph matching. */
function cleanChapterHtml(html: string): string {
  return (
    html
      .replace(/<p>\s*<\/p>/gi, '')
      // Unwrap per-word <span class="word-entry">…</span> markers, keeping their
      // text. They nest inside verse spans, so the non-greedy verse regex would
      // otherwise stop at the first nested </span> and truncate the verse.
      .replace(/<span class="word-entry"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
  );
}

function parseAllVerses(html: string): ScriptureVerse[] {
  const cleaned = cleanChapterHtml(html);
  const verses: ScriptureVerse[] = [];
  const verseRegex =
    /<span class="verse">\s*<sup class="versemarker">(\d+)<\/sup>\s*([\s\S]*?)<\/span>/gi;

  let match = verseRegex.exec(cleaned);
  while (match) {
    const verseBody = match[2];
    // A poetry div can wrap the whole verse span (not just sit inside the body),
    // e.g. <div class="poetry-1"><span class="verse">…</span></div>. Detect that
    // wrapper so the verse keeps its poetic indent and starts on a new line.
    const wrapMatch = cleaned.slice(0, match.index).match(/<div class="poetry-(\d+)">\s*$/i);
    const wrapIndent = wrapMatch ? Number.parseInt(wrapMatch[1], 10) : 0;

    const lines = parseVerseLines(verseBody, wrapIndent);
    if (lines.length > 0) {
      verses.push({
        number: Number.parseInt(match[1], 10),
        lines,
        startsOnNewLine: wrapIndent > 0 || /class="poetry-\d+"/i.test(verseBody),
      });
    }
    match = verseRegex.exec(cleaned);
  }

  return verses;
}

function parseLineParts(lineText: string): ScriptureInlinePart[] {
  const parts: ScriptureInlinePart[] = [];
  const footnoteRegex = /\[\[FN:([^:]+):([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match = footnoteRegex.exec(lineText);

  while (match) {
    const textBefore = lineText.slice(lastIndex, match.index).trim();
    if (textBefore) {
      parts.push({ type: 'text', text: textBefore });
    }

    parts.push({
      type: 'footnote',
      targetId: match[1],
      label: match[2],
    });
    lastIndex = match.index + match[0].length;
    match = footnoteRegex.exec(lineText);
  }

  const trailingText = lineText.slice(lastIndex).trim();
  if (trailingText) {
    parts.push({ type: 'text', text: trailingText });
  }

  return parts;
}

function extractLinesFromSegment(segmentHtml: string, indentLevel: number): ScriptureLine[] {
  if (!segmentHtml.trim()) return [];

  const normalized = segmentHtml
    // Source newlines are insignificant HTML whitespace; only <br>/<div>
    // boundaries below become real line breaks. Without this, markup that puts
    // each word on its own source line splits a verse into one word per line.
    .replace(/\r?\n/g, ' ')
    .replace(/<\/div>\s*<div(?:\s[^>]*)?>/gi, '\n')
    .replace(/<div(?:\s[^>]*)?>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(
      /<sup[^>]*class="caller"[^>]*>\s*<a[^>]*href="#([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/sup>/gi,
      ' [[FN:$1:$2]] ',
    );

  const rawLines = normalized.split('\n');
  const lines: ScriptureLine[] = [];
  let shouldMergeNextTextIntoPrevious = false;

  for (const rawLine of rawLines) {
    const text = decodeHtmlEntities(rawLine.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!text) continue;

    const parts = parseLineParts(text);
    if (parts.length === 0) continue;

    const isFootnoteOnly =
      parts.length > 0 &&
      parts.every((part) => part.type === 'footnote') &&
      lines.length > 0 &&
      lines[lines.length - 1] != null;

    if (isFootnoteOnly) {
      // Keep standalone caller markers attached to the previous rendered text line.
      lines[lines.length - 1].parts.push(...parts);
      shouldMergeNextTextIntoPrevious = true;
      continue;
    }

    if (shouldMergeNextTextIntoPrevious && lines.length > 0) {
      // Some renderings break right after a footnote marker even when sentence continues.
      lines[lines.length - 1].parts.push({ type: 'text', text: ' ' });
      lines[lines.length - 1].parts.push(...parts);
      shouldMergeNextTextIntoPrevious = false;
      continue;
    }

    lines.push({ indentLevel, parts });
    shouldMergeNextTextIntoPrevious = false;
  }

  return lines;
}

function parseVerseLines(verseHtml: string, wrapIndent = 0): ScriptureLine[] {
  const lines: ScriptureLine[] = [];
  const poetryRegex = /<div class="poetry-(\d+)">([\s\S]*?)<\/div>/gi;
  const hasPoetryContent = /class="poetry-\d+"/i.test(verseHtml);
  const baseIndentLevel = wrapIndent > 0 ? wrapIndent : hasPoetryContent ? 1 : 0;
  let lastIndex = 0;
  let match = poetryRegex.exec(verseHtml);

  while (match) {
    const plainBefore = verseHtml.slice(lastIndex, match.index);
    lines.push(...extractLinesFromSegment(plainBefore, baseIndentLevel));

    const indentLevel = Number.parseInt(match[1], 10);
    lines.push(
      ...extractLinesFromSegment(
        match[2],
        Number.isNaN(indentLevel) ? baseIndentLevel + 1 : baseIndentLevel + indentLevel,
      ),
    );
    lastIndex = match.index + match[0].length;
    match = poetryRegex.exec(verseHtml);
  }

  const trailing = verseHtml.slice(lastIndex);
  lines.push(...extractLinesFromSegment(trailing, baseIndentLevel));

  return lines;
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

function parseFootnotes(chapterHtml: string): ScriptureFootnote[] {
  const notes: ScriptureFootnote[] = [];
  const footnoteRegex = /<div class="footnotes">\s*([\s\S]*?)<\/div>/gi;

  let match = footnoteRegex.exec(chapterHtml);
  while (match) {
    const footnoteBlock = match[1];
    const markerMatch = footnoteBlock.match(
      /<sup[^>]*id="([^"]+)"[^>]*class="caller"[^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/sup>/i,
    );

    if (!markerMatch) {
      match = footnoteRegex.exec(chapterHtml);
      continue;
    }

    const noteText = stripTags(footnoteBlock.replace(markerMatch[0], ''));
    if (noteText) {
      notes.push({
        id: markerMatch[1],
        label: markerMatch[2],
        text: noteText,
      });
    }

    match = footnoteRegex.exec(chapterHtml);
  }

  return notes;
}

export function buildChapterContentFromHtml(
  html: string,
  bookName: string,
  chapter: number,
): ChapterContent {
  const sections = parseChapterHtml(html);
  const footnotes = parseFootnotes(html);

  if (sections.every((section) => section.paragraphs.length === 0)) {
    throw new Error('Chapter content is empty');
  }

  return {
    bookName,
    chapter,
    sections,
    footnotes,
  };
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
  const offline = await getOfflineChapterHtml(languageCode, bookSlug, chapter);
  if (offline) {
    return buildChapterContentFromHtml(offline.html, offline.bookName, chapter);
  }

  const data = await graphqlRequest<ChapterContentQueryResult>(CHAPTER_CONTENT_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  const rendering = pickRendering(data.scriptural_rendering_metadata, {
    bookSlug,
    requireChapter: true,
  });
  if (!rendering?.chapter) {
    throw new Error('Chapter not found');
  }

  const apiUrl = rendering.rendered_content.url;
  if (!apiUrl) {
    throw new Error('Chapter rendered URL is missing');
  }

  const response = await fetchRenderedContent(apiUrl);

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
  return buildChapterContentFromHtml(html, rendering.book_name, rendering.chapter);
}
