import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteBookScripture,
  downloadBookScripture,
  getBookScriptureFileSizeBytes,
  getDownloadedBookByteSize,
} from '@/api/services/offline-books';
import { formatByteSize } from '@/api/services/whole-book-parser';

type UseBookDownloadOptions = {
  languageCode: string | undefined;
  bookSlug: string | undefined;
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!languageCode || !bookSlug) {
      setFileSizeLabel(null);
      return;
    }

    let cancelled = false;

    const code = languageCode;
    const slug = bookSlug;

    async function loadFileSizeLabel() {
      const downloadedBytes = await getDownloadedBookByteSize(code, slug);
      if (cancelled) return;

      if (downloadedBytes != null) {
        setFileSizeLabel(formatByteSize(downloadedBytes));
        return;
      }

      const remoteBytes = await getBookScriptureFileSizeBytes(code, slug);
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
  }, [languageCode, bookSlug]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsDownloading(false);
    setProgress(0);
  }, []);

  const startDownload = useCallback(async () => {
    if (!languageCode || !bookSlug || isDownloading) return;

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

  const deleteDownload = useCallback(async () => {
    if (!languageCode || !bookSlug) return;
    await deleteBookScripture(languageCode, bookSlug);
    setFileSizeLabel(null);
    onComplete?.();
  }, [bookSlug, languageCode, onComplete]);

  return {
    isDownloading,
    progress,
    fileSizeLabel,
    startDownload,
    cancelDownload,
    deleteDownload,
  };
}
