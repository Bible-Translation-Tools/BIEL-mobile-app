import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PROGRESS_MIN_DELTA = 0.05;
const PROGRESS_MIN_INTERVAL_MS = 200;

import { formatByteSize } from '@/api/services/whole-book-parser';
import {
    cancelGlobalBookDownload,
    runGlobalBookDownload,
} from '@/services/book-download-runner';
import {
    removeDownloadTask,
    useBookDownloadProgress,
} from '@/stores/download-progress-store';
import {
    buildBookDownloadTaskId,
    type GlobalBookDownloadSync,
} from '@/types/download-progress';
import { scheduleIdleTask } from '@/utils/yield-to-ui';

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
  onDeleteComplete?: () => void;
  /** When set, download progress survives navigation and syncs to system notifications. */
  globalSync?: GlobalBookDownloadSync;
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
  downloadFailedTitle,
  downloadFailedMessage,
  deleteFailedTitle,
  deleteFailedMessage,
  onComplete,
  onDeleteComplete,
  globalSync,
  download,
  deleteContent,
  getDownloadedBytes,
  getTotalBytes,
  getIsDownloaded,
  getCanDownload,
}: UseContentDownloadOptions) {
  const { t } = useTranslation('download');
  const resolvedDownloadFailedTitle = downloadFailedTitle ?? t('downloadFailedTitle');
  const resolvedDownloadFailedMessage =
    downloadFailedMessage ?? t('downloadFailedMessage');
  const resolvedDeleteFailedTitle = deleteFailedTitle ?? t('deleteFailedTitle');
  const resolvedDeleteFailedMessage = deleteFailedMessage ?? t('deleteFailedMessage');

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(enabled);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [canDownload, setCanDownload] = useState(true);
  const [error, setError] = useState<ContentDownloadError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const progressSampleRef = useRef({ value: -1, at: 0 });
  const globalTask = useBookDownloadProgress(globalSync);
  const usesGlobalSync = globalSync != null;

  const scheduleOnComplete = useCallback((callback?: () => void) => {
    if (!callback) return;
    scheduleIdleTask(callback);
  }, []);

  const notifyCompleteIfDownloaded = useCallback(async () => {
    if (!onComplete) return;

    const fullyDownloaded = getIsDownloaded
      ? await getIsDownloaded().catch(() => false)
      : true;

    if (fullyDownloaded) {
      scheduleOnComplete(onComplete);
    }
  }, [getIsDownloaded, onComplete, scheduleOnComplete]);

  const reportProgress = useCallback((value: number) => {
    const now = Date.now();
    const last = progressSampleRef.current;
    if (
      value >= 1 ||
      value - last.value >= PROGRESS_MIN_DELTA ||
      now - last.at >= PROGRESS_MIN_INTERVAL_MS
    ) {
      progressSampleRef.current = { value, at: now };
      setProgress(value);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (globalSync) {
      removeDownloadTask(buildBookDownloadTaskId(globalSync));
    }
  }, [globalSync]);

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
    if (usesGlobalSync && globalSync) {
      cancelGlobalBookDownload(globalSync);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = null;
    setIsDownloading(false);
    setProgress(0);
  }, [globalSync, usesGlobalSync]);

  const startDownload = useCallback(async () => {
    if (!enabled || !canDownload) return;

    const globalDownloading = globalTask?.status === 'downloading';
    if (usesGlobalSync ? globalDownloading : isDownloading) return;

    clearError();

    if (usesGlobalSync && globalSync) {
      await runGlobalBookDownload({
        sync: globalSync,
        download,
        errorFallback: resolvedDownloadFailedMessage,
        onSuccess: async () => {
          if (enabled) {
            await refresh();
          } else if (getIsDownloaded) {
            setIsDownloaded(await getIsDownloaded().catch(() => false));
          }
          await notifyCompleteIfDownloaded();
        },
        onError: (message) => {
          setError({
            title: resolvedDownloadFailedTitle,
            message,
          });
        },
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setProgress(0);
    progressSampleRef.current = { value: -1, at: 0 };

    try {
      await download({
        signal: controller.signal,
        onProgress: reportProgress,
      });
      if (enabled) {
        await refresh();
      } else if (getIsDownloaded) {
        setIsDownloaded(await getIsDownloaded().catch(() => false));
      }
      await notifyCompleteIfDownloaded();
    } catch (err) {
      if (isAbortError(err)) {
        if (enabled) {
          await refresh();
        }
      } else {
        setError({
          title: resolvedDownloadFailedTitle,
          message: toErrorMessage(err, resolvedDownloadFailedMessage),
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
    enabled,
    getIsDownloaded,
    globalSync,
    globalTask?.status,
    isDownloading,
    notifyCompleteIfDownloaded,
    onComplete,
    refresh,
    reportProgress,
    resolvedDownloadFailedMessage,
    resolvedDownloadFailedTitle,
    usesGlobalSync,
  ]);

  const resolvedIsDownloading = usesGlobalSync
    ? globalTask?.status === 'downloading'
    : isDownloading;
  const resolvedProgress = usesGlobalSync ? (globalTask?.progress ?? 0) : progress;
  const resolvedError =
    usesGlobalSync && globalTask?.status === 'failed' && globalTask.errorMessage
      ? { title: resolvedDownloadFailedTitle, message: globalTask.errorMessage }
      : error;

  const deleteDownload = useCallback(async () => {
    clearError();

    try {
      await deleteContent();
      setFileSizeLabel(null);
      if (getIsDownloaded) {
        setIsDownloaded(false);
      }
      if (enabled) {
        await refresh();
      }
      scheduleOnComplete(onDeleteComplete ?? onComplete);
    } catch (err) {
      setError({
        title: resolvedDeleteFailedTitle,
        message: toErrorMessage(err, resolvedDeleteFailedMessage),
      });
    }
  }, [
    clearError,
    deleteContent,
    enabled,
    resolvedDeleteFailedMessage,
    resolvedDeleteFailedTitle,
    getIsDownloaded,
    onComplete,
    onDeleteComplete,
    refresh,
    scheduleOnComplete,
  ]);

  return {
    isDownloading: resolvedIsDownloading,
    progress: resolvedProgress,
    fileSizeLabel,
    isChecking,
    isDownloaded,
    canDownload,
    error: resolvedError,
    clearError,
    startDownload,
    cancelDownload,
    deleteDownload,
    refresh,
  };
}
