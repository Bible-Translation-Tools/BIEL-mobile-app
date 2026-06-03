import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  deleteChapterAudio,
  downloadChapterAudio,
  getChapterAudioTotalBytes,
  getDownloadedChapterAudioByteSize,
  isChapterAudioDownloaded,
} from '@/api/services/offline-audio';
import {
  deleteChapterScripture,
  downloadChapterScripture,
  getChapterScriptureFileSizeBytes,
  getDownloadedChapterScriptureByteSize,
  hasStandaloneChapterScripture,
  isChapterScriptureDownloaded,
} from '@/api/services/offline-text';
import { useContentDownload } from '@/hooks/use-content-download';
import { resolveDownloadStatus } from '@/types/download';

type UseChapterDownloadOptions = {
  languageCode: string;
  bookSlug: string;
  chapter: number;
};

export function useChapterDownload({
  languageCode,
  bookSlug,
  chapter,
}: UseChapterDownloadOptions) {
  const { t } = useTranslation('download');
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
    onComplete: refreshStandalone,
    download: (options) =>
      downloadChapterScripture(languageCode, bookSlug, chapter, options),
    deleteContent: () => deleteChapterScripture(languageCode, bookSlug, chapter),
    getDownloadedBytes: () =>
      getDownloadedChapterScriptureByteSize(languageCode, bookSlug, chapter),
    getTotalBytes: () => getChapterScriptureFileSizeBytes(languageCode, bookSlug, chapter),
    getIsDownloaded: () => isChapterScriptureDownloaded(languageCode, bookSlug, chapter),
  });

  const audio = useContentDownload({
    downloadFailedMessage: t('couldNotDownloadAudio'),
    deleteFailedMessage: t('couldNotRemoveAudio'),
    download: (options) => downloadChapterAudio(languageCode, bookSlug, chapter, options),
    deleteContent: () => deleteChapterAudio(languageCode, bookSlug, chapter),
    getDownloadedBytes: () =>
      getDownloadedChapterAudioByteSize(languageCode, bookSlug, chapter),
    getTotalBytes: () => getChapterAudioTotalBytes(languageCode, bookSlug, chapter),
    getIsDownloaded: () => isChapterAudioDownloaded(languageCode, bookSlug, chapter),
    getCanDownload: async () => {
      const totalBytes = await getChapterAudioTotalBytes(languageCode, bookSlug, chapter).catch(
        () => 0,
      );
      return totalBytes > 0;
    },
  });

  const refreshState = useCallback(async () => {
    await Promise.all([scripture.refresh(), audio.refresh(), refreshStandalone()]);
  }, [audio, refreshStandalone, scripture]);

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
    audioStatus: resolveDownloadStatus(
      audio.isDownloading,
      audio.isDownloaded,
      audio.isChecking,
    ),
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
