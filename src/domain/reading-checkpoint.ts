import type {
  BooksCheckpoint,
  ChapterCheckpoint,
  ReadingCheckpoint,
  ReadingCheckpointReadParams,
  ReadingCheckpointSource,
  ReadingParentHref,
  ReadingRestoreHref,
} from '@/types/reading-checkpoint';

/** `from` route param that marks a chapter opened from the Downloads library. */
export const DOWNLOADS_LIBRARY_FROM_PARAM = 'downloads-library';

/**
 * Route param on the parent screen pushed under a restored reader. The stack shows it without an
 * animation, so the launch restore plays one transition (the reader's).
 */
const RESTORED_PARAM = 'restored';

export function isRestoredRoute(params: object | undefined): boolean {
  return (params as Record<string, unknown> | undefined)?.[RESTORED_PARAM] === '1';
}

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

  const record = parsed as Record<string, unknown>;
  if (!isNonEmptyString(record.languageCode)) return null;
  const languageCode = record.languageCode.trim();

  if (record.screen === 'books') {
    return { screen: 'books', languageCode, hasText: record.hasText !== false };
  }
  // Checkpoints saved before book lists were checkpointed have no `screen`; they are chapters.
  if (record.screen !== undefined && record.screen !== 'read') return null;

  const { bookSlug, bookName, chapter, audioOnly, source } = record;
  if (!isNonEmptyString(bookSlug) || !isNonEmptyString(bookName)) return null;

  const chapterNumber =
    typeof chapter === 'number' ? chapter : Number.parseInt(String(chapter), 10);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) return null;
  if (!isCheckpointSource(source)) return null;

  return {
    screen: 'read',
    languageCode,
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
  if (a.screen === 'books' || b.screen === 'books') {
    return (
      a.screen === b.screen &&
      a.languageCode === b.languageCode &&
      (a as BooksCheckpoint).hasText === (b as BooksCheckpoint).hasText
    );
  }
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

export function checkpointToReadParams(checkpoint: ChapterCheckpoint): ReadingCheckpointReadParams {
  return {
    languageCode: checkpoint.languageCode,
    bookSlug: checkpoint.bookSlug,
    bookName: checkpoint.bookName,
    chapter: String(checkpoint.chapter),
    ...(checkpoint.audioOnly ? { audioOnly: '1' } : {}),
    ...(checkpoint.source === 'downloads-library' ? { from: DOWNLOADS_LIBRARY_FROM_PARAM } : {}),
  };
}

/** The screen the reader was opened from; restored under the reader after a restart. */
export function getReadingParentHref(options: {
  languageCode: string;
  audioOnly: boolean;
  source: ReadingCheckpointSource;
}): ReadingParentHref {
  if (options.source === 'downloads-library') {
    return { pathname: '/downloads-library', params: { [RESTORED_PARAM]: '1' } };
  }

  return {
    pathname: '/books',
    params: {
      languageCode: options.languageCode,
      hasText: options.audioOnly ? '0' : '1',
      [RESTORED_PARAM]: '1',
    },
  };
}

/**
 * The screens to push at launch, in order, to reopen a checkpoint: the book list on its own, or the
 * screen the reader came from (shown without an animation) and then the reader.
 */
export function getRestoreHrefs(checkpoint: ReadingCheckpoint): ReadingRestoreHref[] {
  if (checkpoint.screen === 'books') {
    return [
      {
        pathname: '/books',
        params: { languageCode: checkpoint.languageCode, hasText: checkpoint.hasText ? '1' : '0' },
      },
    ];
  }
  return [
    getReadingParentHref(checkpoint),
    { pathname: '/read', params: checkpointToReadParams(checkpoint) },
  ];
}
