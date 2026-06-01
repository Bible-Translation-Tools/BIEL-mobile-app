import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteLanguageScripture,
  downloadLanguageScripture,
  getLanguageDownloadedByteSize,
  getLanguageScriptureTotalBytes,
} from '@/api/services/offline-text';
import { formatByteSize } from '@/api/services/whole-book-parser';

type UseLanguageDownloadOptions = {
  languageCode: string | undefined;
  enabled?: boolean;
  onComplete?: () => void;
};

export function useLanguageDownload({
  languageCode,
  enabled = true,
  onComplete,
}: UseLanguageDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!languageCode || !enabled) {
      setFileSizeLabel(null);
      return;
    }

    let cancelled = false;
    const code = languageCode;

    async function loadFileSizeLabel() {
      const downloadedBytes = await getLanguageDownloadedByteSize(code);
      if (cancelled) return;

      if (downloadedBytes > 0) {
        const totalBytes = await getLanguageScriptureTotalBytes(code).catch(() => downloadedBytes);
        if (cancelled) return;
        setFileSizeLabel(
          downloadedBytes >= totalBytes
            ? formatByteSize(downloadedBytes)
            : `${formatByteSize(downloadedBytes)} / ${formatByteSize(totalBytes)}`,
        );
        return;
      }

      const remoteBytes = await getLanguageScriptureTotalBytes(code);
      if (cancelled) return;
      setFileSizeLabel(formatByteSize(remoteBytes));
    }

    loadFileSizeLabel().catch(() => {
      if (!cancelled) {
        setFileSizeLabel(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, languageCode]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsDownloading(false);
    setProgress(0);
  }, []);

  const startDownload = useCallback(async () => {
    if (!languageCode || !enabled || isDownloading) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setProgress(0);

    try {
      await downloadLanguageScripture(languageCode, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      const bytes = await getLanguageDownloadedByteSize(languageCode);
      if (bytes > 0) {
        setFileSizeLabel(formatByteSize(bytes));
      }
      onComplete?.();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      throw err;
    } finally {
      abortRef.current = null;
      setIsDownloading(false);
      setProgress(0);
    }
  }, [enabled, isDownloading, languageCode, onComplete]);

  const deleteDownload = useCallback(async () => {
    if (!languageCode) return;
    await deleteLanguageScripture(languageCode);
    setFileSizeLabel(null);
    onComplete?.();
  }, [languageCode, onComplete]);

  return {
    isDownloading,
    progress,
    fileSizeLabel,
    startDownload,
    cancelDownload,
    deleteDownload,
  };
}
