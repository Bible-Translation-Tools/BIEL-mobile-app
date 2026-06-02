import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteBookAudio,
  downloadBookAudio,
  getBookAudioTotalBytes,
  getDownloadedBookAudioByteSize,
  isBookAudioDownloaded,
} from '@/api/services/offline-audio';
import { formatByteSize } from '@/api/services/whole-book-parser';

type UseBookAudioDownloadOptions = {
  languageCode: string | undefined;
  bookSlug: string | undefined;
  onComplete?: () => void;
};

export function useBookAudioDownload({
  languageCode,
  bookSlug,
  onComplete,
}: UseBookAudioDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!languageCode || !bookSlug) {
      setFileSizeLabel(null);
      setIsDownloaded(false);
      setHasAudio(false);
      return;
    }

    let cancelled = false;
    const code = languageCode;
    const slug = bookSlug;

    async function loadState() {
      const downloaded = await isBookAudioDownloaded(code, slug);
      if (cancelled) return;
      setIsDownloaded(downloaded);

      const downloadedBytes = await getDownloadedBookAudioByteSize(code, slug);
      if (cancelled) return;

      try {
        const remoteBytes = await getBookAudioTotalBytes(code, slug);
        if (cancelled) return;
        setHasAudio(remoteBytes > 0);

        if (remoteBytes <= 0) {
          setFileSizeLabel(null);
          return;
        }

        if (downloaded) {
          setFileSizeLabel(formatByteSize(downloadedBytes ?? remoteBytes));
          return;
        }

        if (downloadedBytes != null && downloadedBytes > 0) {
          setFileSizeLabel(
            `${formatByteSize(downloadedBytes)} / ${formatByteSize(remoteBytes)}`,
          );
          return;
        }

        setFileSizeLabel(formatByteSize(remoteBytes));
      } catch {
        if (!cancelled) {
          setHasAudio(downloadedBytes != null);
          setFileSizeLabel(
            downloadedBytes != null ? formatByteSize(downloadedBytes) : null,
          );
        }
      }
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
  }, [languageCode, bookSlug]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsDownloading(false);
    setProgress(0);
  }, []);

  const startDownload = useCallback(async () => {
    if (!languageCode || !bookSlug || isDownloading || !hasAudio) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setProgress(0);

    try {
      await downloadBookAudio(languageCode, bookSlug, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      const bytes = await getDownloadedBookAudioByteSize(languageCode, bookSlug);
      if (bytes != null) {
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
  }, [bookSlug, hasAudio, isDownloading, languageCode, onComplete]);

  const deleteDownload = useCallback(async () => {
    if (!languageCode || !bookSlug) return;
    await deleteBookAudio(languageCode, bookSlug);
    setFileSizeLabel(null);
    setIsDownloaded(false);
    onComplete?.();
  }, [bookSlug, languageCode, onComplete]);

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
