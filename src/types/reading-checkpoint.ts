/** Where the reader was opened from; decides which screen is restored under it at launch. */
export type ReadingCheckpointSource = 'catalog' | 'downloads-library';

/** The book list the user was on (a language is picked), saved so a restart reopens it. */
export type BooksCheckpoint = {
  screen: 'books';
  languageCode: string;
  hasText: boolean;
};

/** The chapter the user was on, saved so the app can reopen it after a restart. */
export type ChapterCheckpoint = {
  screen: 'read';
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  audioOnly: boolean;
  source: ReadingCheckpointSource;
};

/** The screen to reopen after a restart; only one is kept, from whichever screen was focused last. */
export type ReadingCheckpoint = BooksCheckpoint | ChapterCheckpoint;

/** `/read` route params rebuilt from a checkpoint. */
export type ReadingCheckpointReadParams = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapter: string;
  audioOnly?: string;
  from?: string;
};

/** The screen restored under the reader at launch, so Back returns to it. */
export type ReadingParentHref =
  | { pathname: '/downloads-library'; params: { restored: string } }
  | { pathname: '/books'; params: { languageCode: string; hasText: string; restored: string } };

/** One screen pushed at launch to reopen a checkpoint. */
export type ReadingRestoreHref =
  | ReadingParentHref
  | { pathname: '/books'; params: { languageCode: string; hasText: string } }
  | { pathname: '/read'; params: ReadingCheckpointReadParams };
