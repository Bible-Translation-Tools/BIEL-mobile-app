/** Offline download state for list items and download menu rows. */
export type DownloadStatus = 'checking' | 'pending' | 'downloading' | 'downloaded';

export function resolveDownloadStatus(
  isDownloading: boolean,
  isDownloaded: boolean,
  isChecking = false,
): DownloadStatus {
  if (isChecking) return 'checking';
  if (isDownloading) return 'downloading';
  if (isDownloaded) return 'downloaded';
  return 'pending';
}
