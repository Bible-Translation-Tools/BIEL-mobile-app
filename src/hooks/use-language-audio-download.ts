import {
  deleteLanguageAudio,
  downloadLanguageAudio,
  getLanguageAudioTotalBytes,
  getLanguageDownloadedAudioByteSize,
  isBookAudioDownloaded,
  resolveLanguageAudioBooks,
} from '@/api/services/offline-audio';
import { useContentDownload } from '@/hooks/use-content-download';

type UseLanguageAudioDownloadOptions = {
  languageCode: string;
  enabled?: boolean;
  onComplete?: () => void;
};

export function useLanguageAudioDownload({
  languageCode,
  enabled = true,
  onComplete,
}: UseLanguageAudioDownloadOptions) {
  const {
    canDownload,
    ...rest
  } = useContentDownload({
    enabled,
    partialSizeLabel: true,
    downloadFailedMessage: 'Could not download audio',
    onComplete,
    download: (options) => downloadLanguageAudio(languageCode, options),
    deleteContent: () => deleteLanguageAudio(languageCode),
    getDownloadedBytes: async () => {
      const bytes = await getLanguageDownloadedAudioByteSize(languageCode);
      return bytes > 0 ? bytes : null;
    },
    getTotalBytes: () => getLanguageAudioTotalBytes(languageCode),
    getIsDownloaded: async () => {
      const books = await resolveLanguageAudioBooks(languageCode).catch(() => []);
      if (books.length === 0) return false;

      for (const book of books) {
        if (!(await isBookAudioDownloaded(languageCode, book.bookSlug))) {
          return false;
        }
      }
      return true;
    },
    getCanDownload: async () => {
      const books = await resolveLanguageAudioBooks(languageCode).catch(() => []);
      return books.length > 0;
    },
  });

  return {
    ...rest,
    hasAudio: canDownload,
  };
}
