/** Offline download state for list items and download menu rows. */
export type DownloadStatus = 'checking' | 'pending' | 'downloading' | 'partial' | 'downloaded';

/** How a download ended. Callers must not treat `cancelled` or `partial` as success. */
export type DownloadOutcome =
  | { status: 'completed' }
  | { status: 'cancelled' }
  | { status: 'partial'; failedBookSlugs: string[] };

/** Why a download failed, as data. Hooks turn it into translated text. */
export type DownloadFailure =
  | { reason: 'missing-audio-chapters'; chapters: number[] }
  | { reason: 'failed-books'; count: number }
  /** Any other error; `message` is the raw error text, if there was one. */
  | { reason: 'error'; message?: string };
