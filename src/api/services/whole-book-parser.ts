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

function addChapter(chapters: Map<number, string>, chapterNumber: number, html: string) {
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) return;
  chapters.set(chapterNumber, html);
}

function parseChapterRecord(
  chapters: Map<number, string>,
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

function parseChaptersObject(chapters: Map<number, string>, value: Record<string, unknown>) {
  for (const [key, chapterValue] of Object.entries(value)) {
    parseChapterRecord(chapters, key, chapterValue);
  }
}

function parseChapterNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return Number.NaN;
}

function parseChaptersArray(chapters: Map<number, string>, value: unknown[]) {
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
 * Parses a whole-book JSON payload into chapter number → HTML.
 */
export function parseWholeBookJson(payload: unknown): Map<number, string> {
  const chapters = new Map<number, string>();

  if (payload == null) {
    return chapters;
  }

  if (Array.isArray(payload)) {
    parseChaptersArray(chapters, payload);
    return chapters;
  }

  if (typeof payload !== 'object') {
    return chapters;
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

  return chapters;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
