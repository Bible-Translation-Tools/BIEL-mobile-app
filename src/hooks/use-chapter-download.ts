import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveDownloadStatus } from '@/domain/downloads';
import {
  deleteChapterAudio,
  deleteChapterScripture,
  downloadChapterAudio,
  downloadChapterScripture,
  getChapterAudioTotalBytes,
  getChapterScriptureFileSizeBytes,
  hasStandaloneChapterScripture,
  isChapterAudioDownloaded,
  isChapterScriptureDownloaded,
  loadDownloadedChapterAudioByteSize,
  loadDownloadedChapterScriptureByteSize,
} from '@/features/downloads';
import { useContentDownload } from '@/hooks/use-content-download';
import type { GlobalDownloadSync } from '@/types/download-progress';

type UseChapterDownloadOptions = {
  languageCode: string;
  bookSlug: string;
  /** Shown in the system download notification. */
  bookName: string;
  chapter: number;
};

export function useChapterDownload({
  languageCode,
  bookSlug,
  bookName,
  chapter,
}: UseChapterDownloadOptions) {
  const { t } = useTranslation('download');
  // Routing through the shared job runner gives chapter downloads the same system
  // notification (and navigation-surviving progress) as book and language downloads.
  const scriptureSync = useMemo<GlobalDownloadSync>(
    () => ({
      languageCode,
      contentType: 'text',
      book: { slug: bookSlug, name: bookName },
      chapter,
    }),
    [bookName, bookSlug, chapter, languageCode],
  );
  const audioSync = useMemo<GlobalDownloadSync>(
    () => ({
      languageCode,
      contentType: 'audio',
      book: { slug: bookSlug, name: bookName },
      chapter,
    }),
    [bookName, bookSlug, chapter, languageCode],
  );
  const [scriptureStandalone, setScriptureStandalone] = useState(false);

  const refreshStandalone = useCallback(async () => {
    const standalone = await hasStandaloneChapterScripture(languageCode, bookSlug, chapter);
    setScriptureStandalone(standalone);
  }, [bookSlug, chapter, languageCode]);

  useEffect(() => {
    refreshStandalone().catch(() => {
      setScriptureStandalone(false);
    });
  }, [refreshStandalone]);

  const scripture = useContentDownload({
    downloadFailedMessage: t('couldNotDownloadChapter'),
    deleteFailedMessage: t('couldNotRemoveChapter'),
    globalSync: scriptureSync,
    onComplete: refreshStandalone,
    download: (options) => downloadChapterScripture(languageCode, bookSlug, chapter, options),
    deleteContent: () => deleteChapterScripture(languageCode, bookSlug, chapter),
    getDownloadedBytes: () =>
      loadDownloadedChapterScriptureByteSize(languageCode, bookSlug, chapter),
    getTotalBytes: () => getChapterScriptureFileSizeBytes(languageCode, bookSlug, chapter),
    getIsDownloaded: () => isChapterScriptureDownloaded(languageCode, bookSlug, chapter),
  });

  const audio = useContentDownload({
    downloadFailedMessage: t('couldNotDownloadAudio'),
    deleteFailedMessage: t('couldNotRemoveAudio'),
    globalSync: audioSync,
    download: (options) => downloadChapterAudio(languageCode, bookSlug, chapter, options),
    deleteContent: () => deleteChapterAudio(languageCode, bookSlug, chapter),
    getDownloadedBytes: () => loadDownloadedChapterAudioByteSize(languageCode, bookSlug, chapter),
    getTotalBytes: () => getChapterAudioTotalBytes(languageCode, bookSlug, chapter),
    getIsDownloaded: () => isChapterAudioDownloaded(languageCode, bookSlug, chapter),
    getCanDownload: async () => {
      const totalBytes = await getChapterAudioTotalBytes(languageCode, bookSlug, chapter).catch(
        () => 0,
      );
      return totalBytes > 0;
    },
  });

  async function refreshState() {
    await Promise.all([scripture.refresh(), audio.refresh(), refreshStandalone()]);
  }

  return {
    scriptureFileSizeLabel: scripture.fileSizeLabel,
    scriptureStatus: resolveDownloadStatus(
      scripture.isDownloading,
      scripture.isDownloaded,
      scripture.isChecking,
    ),
    scriptureProgress: scripture.progress,
    scriptureStandalone,
    startScriptureDownload: scripture.startDownload,
    cancelScriptureDownload: scripture.cancelDownload,
    deleteScriptureDownload: scripture.deleteDownload,
    scriptureError: scripture.error,
    clearScriptureError: scripture.clearError,
    audioFileSizeLabel: audio.fileSizeLabel,
    audioStatus: resolveDownloadStatus(audio.isDownloading, audio.isDownloaded, audio.isChecking),
    audioProgress: audio.progress,
    hasAudio: audio.canDownload,
    startAudioDownload: audio.startDownload,
    cancelAudioDownload: audio.cancelDownload,
    deleteAudioDownload: audio.deleteDownload,
    audioError: audio.error,
    clearAudioError: audio.clearError,
    refreshState,
  };
}
