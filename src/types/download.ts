/** Offline download state for list items and download menu rows. */
export type DownloadStatus = 'checking' | 'pending' | 'downloading' | 'partial' | 'downloaded';

export function resolveDownloadStatus(
  isDownloading: boolean,
  isDownloaded: boolean,
  isChecking = false,
  isPartial = false,
): DownloadStatus {
  if (isChecking) return 'checking';
  if (isDownloading) return 'downloading';
  if (isDownloaded) return 'downloaded';
  if (isPartial) return 'partial';
  return 'pending';
}
