import { useTranslation } from 'react-i18next';

import {
  deleteBookAudio,
  downloadBookAudio,
  getBookAudioTotalBytes,
  getDownloadedBookAudioByteSize,
  isBookAudioDownloaded,
} from '@/api/services/offline-audio';
import { useContentDownload } from '@/hooks/use-content-download';

type UseBookAudioDownloadOptions = {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  enabled?: boolean;
  onComplete?: () => void;
};

export function useBookAudioDownload({
  languageCode,
  bookSlug,
  bookName,
  enabled = true,
  onComplete,
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
    download: (options) => downloadBookAudio(languageCode, bookSlug, options),
    deleteContent: () => deleteBookAudio(languageCode, bookSlug),
    getDownloadedBytes: () => getDownloadedBookAudioByteSize(languageCode, bookSlug),
    getTotalBytes: () => getBookAudioTotalBytes(languageCode, bookSlug),
    getIsDownloaded: () => isBookAudioDownloaded(languageCode, bookSlug),
    getCanDownload: async () => {
      const remoteBytes = await getBookAudioTotalBytes(languageCode, bookSlug).catch(() => 0);
      if (remoteBytes > 0) return true;

      const downloadedBytes = await getDownloadedBookAudioByteSize(languageCode, bookSlug);
      return downloadedBytes != null && downloadedBytes > 0;
    },
  });

  return {
    ...rest,
    hasAudio: canDownload,
    deleteAudioDownload,
  };
}
