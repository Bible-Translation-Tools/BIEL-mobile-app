import { useCallback, useEffect, useRef, useState } from 'react';

import { formatByteSize } from '@/api/services/whole-book-parser';

export type ContentDownloadError = {
  title: string;
  message: string;
};

export type ContentDownloadHandlers = {
  download: (options: {
    signal: AbortSignal;
    onProgress: (progress: number) => void;
  }) => Promise<void>;
  deleteContent: () => Promise<void>;
  getDownloadedBytes: () => Promise<number | null>;
  getTotalBytes: () => Promise<number>;
  getIsDownloaded?: () => Promise<boolean>;
  getCanDownload?: () => Promise<boolean>;
};

export type UseContentDownloadOptions = ContentDownloadHandlers & {
  enabled?: boolean;
  /** When true, show "downloaded / total" while partially downloaded. */
  partialSizeLabel?: boolean;
  downloadFailedTitle?: string;
  downloadFailedMessage?: string;
  deleteFailedTitle?: string;
  deleteFailedMessage?: string;
  onComplete?: () => void;
};

function computeFileSizeLabel(
  downloadedBytes: number | null,
  totalBytes: number,
  partialSizeLabel: boolean,
): string | null {
  if (downloadedBytes != null && downloadedBytes > 0) {
    if (partialSizeLabel && totalBytes > 0 && downloadedBytes < totalBytes) {
      return `${formatByteSize(downloadedBytes)} / ${formatByteSize(totalBytes)}`;
    }
    return formatByteSize(downloadedBytes);
  }

  if (totalBytes > 0) {
    return formatByteSize(totalBytes);
  }

  return null;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export function useContentDownload({
  enabled = true,
  partialSizeLabel = false,
  downloadFailedTitle = 'Download failed',
  downloadFailedMessage = 'Could not complete download',
  deleteFailedTitle = 'Delete failed',
  deleteFailedMessage = 'Could not remove download',
  onComplete,
  download,
  deleteContent,
  getDownloadedBytes,
  getTotalBytes,
  getIsDownloaded,
  getCanDownload,
}: UseContentDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(enabled);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [canDownload, setCanDownload] = useState(true);
  const [error, setError] = useState<ContentDownloadError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setFileSizeLabel(null);
      setIsDownloaded(false);
      setCanDownload(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    try {
      let available = true;
      if (getCanDownload) {
        available = await getCanDownload();
      }
      setCanDownload(available);

      const downloadedBytes = await getDownloadedBytes().catch(() => null);

      if (getIsDownloaded) {
        setIsDownloaded(await getIsDownloaded().catch(() => false));
      }

      if (!available) {
        setFileSizeLabel(
          downloadedBytes != null && downloadedBytes > 0
            ? formatByteSize(downloadedBytes)
            : null,
        );
        return;
      }

      try {
        const totalBytes = await getTotalBytes();
        if (totalBytes <= 0 && !(downloadedBytes != null && downloadedBytes > 0)) {
          setFileSizeLabel(null);
          setCanDownload(false);
          return;
        }

        setFileSizeLabel(computeFileSizeLabel(downloadedBytes, totalBytes, partialSizeLabel));
      } catch {
        setFileSizeLabel(
          downloadedBytes != null && downloadedBytes > 0
            ? formatByteSize(downloadedBytes)
            : null,
        );
        setCanDownload(downloadedBytes != null && downloadedBytes > 0);
      }
    } catch {
      setFileSizeLabel(null);
      setIsDownloaded(false);
      setCanDownload(false);
    } finally {
      setIsChecking(false);
    }
  }, [
    enabled,
    getCanDownload,
    getDownloadedBytes,
    getIsDownloaded,
    getTotalBytes,
    partialSizeLabel,
  ]);

  useEffect(() => {
    refresh().catch(() => {
      setFileSizeLabel(null);
      setIsDownloaded(false);
      setCanDownload(false);
      setIsChecking(false);
    });
  }, [refresh]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsDownloading(false);
    setProgress(0);
  }, []);

  const startDownload = useCallback(async () => {
    if (!enabled || isDownloading || !canDownload) return;

    clearError();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setProgress(0);

    try {
      await download({
        signal: controller.signal,
        onProgress: setProgress,
      });
      await refresh();
      onComplete?.();
    } catch (err) {
      if (!isAbortError(err)) {
        setError({
          title: downloadFailedTitle,
          message: toErrorMessage(err, downloadFailedMessage),
        });
      }
    } finally {
      abortRef.current = null;
      setIsDownloading(false);
      setProgress(0);
    }
  }, [
    canDownload,
    clearError,
    download,
    downloadFailedMessage,
    downloadFailedTitle,
    enabled,
    isDownloading,
    onComplete,
    refresh,
  ]);

  const deleteDownload = useCallback(async () => {
    clearError();

    try {
      await deleteContent();
      setFileSizeLabel(null);
      if (getIsDownloaded) {
        setIsDownloaded(false);
      }
      await refresh();
      onComplete?.();
    } catch (err) {
      setError({
        title: deleteFailedTitle,
        message: toErrorMessage(err, deleteFailedMessage),
      });
    }
  }, [
    clearError,
    deleteContent,
    deleteFailedMessage,
    deleteFailedTitle,
    getIsDownloaded,
    onComplete,
    refresh,
  ]);

  return {
    isDownloading,
    progress,
    fileSizeLabel,
    isChecking,
    isDownloaded,
    canDownload,
    error,
    clearError,
    startDownload,
    cancelDownload,
    deleteDownload,
    refresh,
  };
}
