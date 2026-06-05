import type { OfflineBook, OfflineChapter } from '@/types/offline';

function isHtmlString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function extractHtmlFromChapterValue(value: unknown): string | null {
  if (isHtmlString(value)) {
    return value;
  }

  if (value != null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['content', 'html', 'text', 'body']) {
      if (isHtmlString(record[key])) {
        return record[key];
      }
    }
  }

  return null;
}

function addChapter(
  chapters: Map<number, OfflineChapter>,
  chapterNumber: number,
  html: string,
) {
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) return;
  chapters.set(chapterNumber, { number: chapterNumber, html });
}

function parseChapterRecord(
  chapters: Map<number, OfflineChapter>,
  key: string,
  value: unknown,
) {
  const chapterNumber = Number.parseInt(key, 10);
  if (!Number.isNaN(chapterNumber) && /^\d+$/.test(key.trim())) {
    const html = extractHtmlFromChapterValue(value);
    if (html) {
      addChapter(chapters, chapterNumber, html);
      return;
    }
  }

  if (value != null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const fromField =
      typeof record.chapter === 'number'
        ? record.chapter
        : typeof record.chapter === 'string'
          ? Number.parseInt(record.chapter, 10)
          : typeof record.number === 'number'
            ? record.number
            : Number.NaN;

    const html = extractHtmlFromChapterValue(value);
    if (!Number.isNaN(fromField) && html) {
      addChapter(chapters, fromField, html);
    }
  }
}

function parseChaptersObject(
  chapters: Map<number, OfflineChapter>,
  value: Record<string, unknown>,
) {
  for (const [key, chapterValue] of Object.entries(value)) {
    parseChapterRecord(chapters, key, chapterValue);
  }
}

function parseChapterNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return Number.NaN;
}

function parseChaptersArray(chapters: Map<number, OfflineChapter>, value: unknown[]) {
  for (const item of value) {
    if (item == null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const chapterNumber = parseChapterNumber(record.number ?? record.chapter);
    const html = extractHtmlFromChapterValue(item);
    if (!Number.isNaN(chapterNumber) && html) {
      addChapter(chapters, chapterNumber, html);
    }
  }
}

/**
 * Parses an external whole-book JSON payload into an internal OfflineBook model.
 */
export function parseWholeBookJson(payload: unknown): OfflineBook {
  const chapters = new Map<number, OfflineChapter>();

  if (payload == null) {
    return { slug: '', name: '', chapters };
  }

  if (Array.isArray(payload)) {
    parseChaptersArray(chapters, payload);
    return { slug: '', name: '', chapters };
  }

  if (typeof payload !== 'object') {
    return { slug: '', name: '', chapters };
  }

  const root = payload as Record<string, unknown>;

  if (root.chapters != null) {
    if (Array.isArray(root.chapters)) {
      parseChaptersArray(chapters, root.chapters);
    } else if (typeof root.chapters === 'object') {
      parseChaptersObject(chapters, root.chapters as Record<string, unknown>);
    }
  }

  if (root.content != null && typeof root.content === 'object' && !Array.isArray(root.content)) {
    parseChaptersObject(chapters, root.content as Record<string, unknown>);
  }

  for (const [key, value] of Object.entries(root)) {
    if (key === 'chapters' || key === 'content' || key === 'metadata' || key === 'meta') {
      continue;
    }
    parseChapterRecord(chapters, key, value);
  }

  const slug =
    typeof root.book_slug === 'string'
      ? root.book_slug
      : typeof root.slug === 'string'
        ? root.slug
        : '';
  const name =
    typeof root.book_name === 'string'
      ? root.book_name
      : typeof root.name === 'string'
        ? root.name
        : '';

  return { slug, name, chapters };
}

export function offlineBookChapterHtmlMap(book: OfflineBook): Map<number, string> {
  const chapters = new Map<number, string>();
  for (const [chapterNumber, chapter] of book.chapters.entries()) {
    chapters.set(chapterNumber, chapter.html);
  }
  return chapters;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
