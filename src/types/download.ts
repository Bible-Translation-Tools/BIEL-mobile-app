/** Offline download state for list items and download menu rows. */
export type DownloadStatus = 'checking' | 'pending' | 'downloading' | 'partial' | 'downloaded';

/** How a download ended. Callers must not treat `cancelled` or `partial` as success. */
export type DownloadOutcome =
  | { status: 'completed' }
  | { status: 'cancelled' }
  | { status: 'partial'; failedBookSlugs: string[] };
