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
  languageCode: string;
  bookSlug: string;
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
  const [isChecking, setIsChecking] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      setIsChecking(true);

      try {
        const downloaded = await isBookAudioDownloaded(languageCode, bookSlug);
        if (cancelled) return;
        setIsDownloaded(downloaded);

        const downloadedBytes = await getDownloadedBookAudioByteSize(languageCode, bookSlug);
        if (cancelled) return;

        try {
          const remoteBytes = await getBookAudioTotalBytes(languageCode, bookSlug);
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
      } catch {
        if (!cancelled) {
          setFileSizeLabel(null);
          setIsDownloaded(false);
          setHasAudio(false);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    loadState();

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
    if (isDownloading || !hasAudio) return;

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

  const deleteAudioDownload = useCallback(async () => {
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
    isChecking,
    startDownload,
    cancelDownload,
    deleteAudioDownload,
  };
}
