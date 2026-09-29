import { useTranslation } from 'react-i18next';

import {
  deleteLanguageAudio,
  downloadLanguageAudio,
  getLanguageAudioTotalBytes,
  loadLanguageDownloadedAudioByteSize,
  isLanguageAudioDownloaded,
  fetchLanguageAudioBooks,
} from '@/features/downloads';
import { useContentDownload } from '@/hooks/use-content-download';

type UseLanguageAudioDownloadOptions = {
  languageCode: string;
  languageName: string;
  enabled?: boolean;
  onComplete?: () => void;
};

export function useLanguageAudioDownload({
  languageCode,
  languageName,
  enabled = true,
  onComplete,
}: UseLanguageAudioDownloadOptions) {
  const { t } = useTranslation('download');
  const {
    canDownload,
    ...rest
  } = useContentDownload({
    enabled,
    partialSizeLabel: true,
    globalSync: {
      languageCode,
      languageName,
      kind: 'language-audio',
    },
    downloadFailedMessage: t('couldNotDownloadAudio'),
    onComplete,
    download: (options) => downloadLanguageAudio(languageCode, options),
    deleteContent: () => deleteLanguageAudio(languageCode),
    getDownloadedBytes: async () => {
      const bytes = await loadLanguageDownloadedAudioByteSize(languageCode);
      return bytes > 0 ? bytes : null;
    },
    getTotalBytes: () => getLanguageAudioTotalBytes(languageCode),
    getIsDownloaded: () => isLanguageAudioDownloaded(languageCode).catch(() => false),
    getCanDownload: async () => {
      const books = await fetchLanguageAudioBooks(languageCode).catch(() => []);
      return books.length > 0;
    },
  });

  return {
    ...rest,
    hasAudio: canDownload,
  };
}
