/** Where the reader was opened from; decides which screen is restored under it at launch. */
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

/** The screen restored under the reader at launch, so Back returns to it. */
export type ReadingParentHref =
  | '/downloads-library'
  | { pathname: '/books'; params: { languageCode: string; hasText: string } };
