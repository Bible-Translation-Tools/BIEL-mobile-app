import type {
  ReadingCheckpoint,
  ReadingCheckpointReadParams,
  ReadingCheckpointSource,
  ReadingParentHref,
} from '@/types/reading-checkpoint';

/** `from` route param that marks a chapter opened from the Downloads library. */
export const DOWNLOADS_LIBRARY_FROM_PARAM = 'downloads-library';

const SOURCES: readonly string[] = [
  'catalog',
  'downloads-library',
] satisfies ReadingCheckpointSource[];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCheckpointSource(value: unknown): value is ReadingCheckpointSource {
  return typeof value === 'string' && SOURCES.includes(value);
}

/** Reads a saved checkpoint; anything malformed counts as no checkpoint. */
export function parseReadingCheckpoint(raw: string | null | undefined): ReadingCheckpoint | null {
  if (raw == null || raw.trim().length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const { languageCode, bookSlug, bookName, chapter, audioOnly, source } = parsed as Record<
    string,
    unknown
  >;
  if (!isNonEmptyString(languageCode) || !isNonEmptyString(bookSlug) || !isNonEmptyString(bookName))
    return null;

  const chapterNumber =
    typeof chapter === 'number' ? chapter : Number.parseInt(String(chapter), 10);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) return null;
  if (!isCheckpointSource(source)) return null;

  return {
    languageCode: languageCode.trim(),
    bookSlug: bookSlug.trim(),
    bookName: bookName.trim(),
    chapter: Math.floor(chapterNumber),
    audioOnly: audioOnly === true,
    source,
  };
}

export function serializeReadingCheckpoint(checkpoint: ReadingCheckpoint): string {
  return JSON.stringify(checkpoint);
}

export function readingCheckpointsEqual(
  a: ReadingCheckpoint | null,
  b: ReadingCheckpoint | null,
): boolean {
  if (a == null || b == null) return a === b;
  return (
    a.languageCode === b.languageCode &&
    a.bookSlug === b.bookSlug &&
    a.bookName === b.bookName &&
    a.chapter === b.chapter &&
    a.audioOnly === b.audioOnly &&
    a.source === b.source
  );
}

export function resolveReadingCheckpointSource(
  fromParam: string | undefined,
): ReadingCheckpointSource {
  return fromParam === DOWNLOADS_LIBRARY_FROM_PARAM ? 'downloads-library' : 'catalog';
}

export function checkpointToReadParams(checkpoint: ReadingCheckpoint): ReadingCheckpointReadParams {
  return {
    languageCode: checkpoint.languageCode,
    bookSlug: checkpoint.bookSlug,
    bookName: checkpoint.bookName,
    chapter: String(checkpoint.chapter),
    ...(checkpoint.audioOnly ? { audioOnly: '1' } : {}),
    ...(checkpoint.source === 'downloads-library' ? { from: DOWNLOADS_LIBRARY_FROM_PARAM } : {}),
  };
}

/** Where Back goes from a reader that was restored with no history behind it. */
export function getReadingParentHref(options: {
  languageCode: string;
  audioOnly: boolean;
  source: ReadingCheckpointSource;
}): ReadingParentHref {
  if (options.source === 'downloads-library') return '/downloads-library';

  return {
    pathname: '/books',
    params: { languageCode: options.languageCode, hasText: options.audioOnly ? '0' : '1' },
  };
}
