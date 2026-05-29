import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteLanguageAudio,
  downloadLanguageAudio,
  getLanguageAudioTotalBytes,
  getLanguageDownloadedAudioByteSize,
  isBookAudioDownloaded,
  resolveLanguageAudioBooks,
} from '@/api/services/offline-audio';
import { formatByteSize } from '@/api/services/whole-book-parser';

type UseLanguageAudioDownloadOptions = {
  languageCode: string | undefined;
  enabled?: boolean;
  onComplete?: () => void;
};

export function useLanguageAudioDownload({
  languageCode,
  enabled = true,
  onComplete,
}: UseLanguageAudioDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!languageCode || !enabled) {
      setFileSizeLabel(null);
      setIsDownloaded(false);
      setHasAudio(false);
      return;
    }

    let cancelled = false;
    const code = languageCode;

    async function loadState() {
      const books = await resolveLanguageAudioBooks(code).catch(() => []);
      if (cancelled) return;

      if (books.length === 0) {
        setHasAudio(false);
        setFileSizeLabel(null);
        setIsDownloaded(false);
        return;
      }

      setHasAudio(true);

      let allDownloaded = true;
      for (const book of books) {
        if (!(await isBookAudioDownloaded(code, book.bookSlug))) {
          allDownloaded = false;
          break;
        }
      }
      if (cancelled) return;
      setIsDownloaded(allDownloaded);

      const downloadedBytes = await getLanguageDownloadedAudioByteSize(code);
      if (cancelled) return;

      if (downloadedBytes > 0) {
        const totalBytes = await getLanguageAudioTotalBytes(code).catch(() => downloadedBytes);
        if (cancelled) return;
        setFileSizeLabel(
          downloadedBytes >= totalBytes
            ? formatByteSize(downloadedBytes)
            : `${formatByteSize(downloadedBytes)} / ${formatByteSize(totalBytes)}`,
        );
        return;
      }

      const remoteBytes = await getLanguageAudioTotalBytes(code);
      if (cancelled) return;
      setFileSizeLabel(formatByteSize(remoteBytes));
    }

    loadState().catch(() => {
      if (!cancelled) {
        setFileSizeLabel(null);
        setIsDownloaded(false);
        setHasAudio(false);
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
    if (!languageCode || !enabled || isDownloading || !hasAudio) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setProgress(0);

    try {
      await downloadLanguageAudio(languageCode, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      const bytes = await getLanguageDownloadedAudioByteSize(languageCode);
      if (bytes > 0) {
        setFileSizeLabel(formatByteSize(bytes));
      }
      setIsDownloaded(true);
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
  }, [enabled, hasAudio, isDownloading, languageCode, onComplete]);

  const deleteDownload = useCallback(async () => {
    if (!languageCode) return;
    await deleteLanguageAudio(languageCode);
    setFileSizeLabel(null);
    setIsDownloaded(false);
    onComplete?.();
  }, [languageCode, onComplete]);

  return {
    isDownloading,
    progress,
    fileSizeLabel,
    isDownloaded,
    hasAudio,
    startDownload,
    cancelDownload,
    deleteDownload,
  };
}
