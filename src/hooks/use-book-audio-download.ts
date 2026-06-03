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
  onComplete?: () => void;
};

export function useBookAudioDownload({
  languageCode,
  bookSlug,
  onComplete,
}: UseBookAudioDownloadOptions) {
  const {
    canDownload,
    deleteDownload: deleteAudioDownload,
    ...rest
  } = useContentDownload({
    partialSizeLabel: true,
    downloadFailedMessage: 'Could not download audio',
    deleteFailedMessage: 'Could not remove downloaded audio',
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
