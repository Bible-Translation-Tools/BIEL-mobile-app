import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteBookScripture,
  downloadBookScripture,
  getBookScriptureFileSizeBytes,
  getDownloadedBookByteSize,
} from '@/api/services/offline-text';
import { formatByteSize } from '@/api/services/whole-book-parser';

type UseBookDownloadOptions = {
  languageCode: string;
  bookSlug: string;
  onComplete?: () => void;
};

export function useBookDownload({
  languageCode,
  bookSlug,
  onComplete,
}: UseBookDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFileSizeLabel() {
      setIsChecking(true);

      try {
        const downloadedBytes = await getDownloadedBookByteSize(languageCode, bookSlug);
        if (cancelled) return;

        if (downloadedBytes != null) {
          setFileSizeLabel(formatByteSize(downloadedBytes));
          return;
        }

        const remoteBytes = await getBookScriptureFileSizeBytes(languageCode, bookSlug);
        if (cancelled) return;

        setFileSizeLabel(formatByteSize(remoteBytes));
      } catch {
        if (!cancelled) {
          setFileSizeLabel(null);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    loadFileSizeLabel();

    return () => {
      cancelled = true;
    };
  }, [languageCode, bookSlug]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsDownloading(false);
    setProgress(0);
  }, []);

  const startDownload = useCallback(async () => {
    if (isDownloading) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setProgress(0);

    try {
      await downloadBookScripture(languageCode, bookSlug, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      const bytes = await getDownloadedBookByteSize(languageCode, bookSlug);
      if (bytes != null) {
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
  }, [bookSlug, isDownloading, languageCode, onComplete]);

  const deleteScriptureDownload = useCallback(async () => {
    await deleteBookScripture(languageCode, bookSlug);
    setFileSizeLabel(null);
    onComplete?.();
  }, [bookSlug, languageCode, onComplete]);

  return {
    isDownloading,
    progress,
    fileSizeLabel,
    isChecking,
    startDownload,
    cancelDownload,
    deleteScriptureDownload,
  };
}
