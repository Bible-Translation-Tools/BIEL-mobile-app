import { useTranslation } from 'react-i18next';

import {
  deleteBookAudio,
  downloadBookAudio,
  fetchBookAudioTotalBytes,
  loadDownloadedBookAudioByteSize,
  isBookAudioDownloaded,
} from '@/features/downloads';
import { useContentDownload } from '@/hooks/use-content-download';

type UseBookAudioDownloadOptions = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  enabled?: boolean;
  onComplete?: () => void;
  onDeleteComplete?: () => void;
};

export function useBookAudioDownload({
  languageCode,
  bookSlug,
  bookName,
  enabled = true,
  onComplete,
  onDeleteComplete,
}: UseBookAudioDownloadOptions) {
  const { t } = useTranslation('download');
  const {
    canDownload,
    deleteDownload: deleteAudioDownload,
    ...rest
  } = useContentDownload({
    enabled,
    globalSync: {
      languageCode,
      bookSlug,
      bookName,
      kind: 'book-audio',
    },
    partialSizeLabel: true,
    downloadFailedMessage: t('couldNotDownloadAudio'),
    deleteFailedMessage: t('couldNotRemoveAudio'),
    onComplete,
    onDeleteComplete,
    download: (options) => downloadBookAudio(languageCode, bookSlug, options),
    deleteContent: () => deleteBookAudio(languageCode, bookSlug),
    getDownloadedBytes: () => loadDownloadedBookAudioByteSize(languageCode, bookSlug),
    getTotalBytes: () => fetchBookAudioTotalBytes(languageCode, bookSlug),
    getIsDownloaded: () => isBookAudioDownloaded(languageCode, bookSlug),
    getCanDownload: async () => {
      const remoteBytes = await fetchBookAudioTotalBytes(languageCode, bookSlug).catch(() => 0);
      if (remoteBytes > 0) return true;

      const downloadedBytes = await loadDownloadedBookAudioByteSize(languageCode, bookSlug);
      return downloadedBytes != null && downloadedBytes > 0;
    },
  });

  return {
    ...rest,
    hasAudio: canDownload,
    deleteAudioDownload,
  };
}
