/** Where the reader was opened from; decides where Back goes when there is no history. */
export type ReadingCheckpointSource = 'catalog' | 'downloads-library';

/** The chapter the user was on, saved so the app can reopen it after a restart. */
export type ReadingCheckpoint = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  audioOnly: boolean;
  source: ReadingCheckpointSource;
};

/** `/read` route params rebuilt from a checkpoint. */
export type ReadingCheckpointReadParams = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapter: string;
  audioOnly?: string;
  from?: string;
};

/** Screen to return to from the reader when the stack has no history. */
export type ReadingParentHref =
  | '/downloads-library'
  | { pathname: '/books'; params: { languageCode: string; hasText: string } };
