/** Offline download state for list items and download menu rows. */
export type DownloadStatus = 'pending' | 'downloading' | 'downloaded';

export function resolveDownloadStatus(
  isDownloading: boolean,
  isDownloaded: boolean,
): DownloadStatus {
  if (isDownloading) return 'downloading';
  if (isDownloaded) return 'downloaded';
  return 'pending';
}
