import { useTranslation } from 'react-i18next';

import {
  deleteLanguageScripture,
  downloadLanguageScripture,
  getLanguageDownloadedByteSize,
  getLanguageScriptureTotalBytes,
} from '@/api/services/offline-text';
import { useContentDownload } from '@/hooks/use-content-download';

type UseLanguageDownloadOptions = {
  languageCode: string;
  enabled?: boolean;
  onComplete?: () => void;
};

export function useLanguageDownload({
  languageCode,
  enabled = true,
  onComplete,
}: UseLanguageDownloadOptions) {
  const { t } = useTranslation('download');

  return useContentDownload({
    enabled,
    partialSizeLabel: true,
    downloadFailedMessage: t('couldNotDownloadLanguage'),
    onComplete,
    download: (options) => downloadLanguageScripture(languageCode, options),
    deleteContent: () => deleteLanguageScripture(languageCode),
    getDownloadedBytes: async () => {
      const bytes = await getLanguageDownloadedByteSize(languageCode);
      return bytes > 0 ? bytes : null;
    },
    getTotalBytes: () => getLanguageScriptureTotalBytes(languageCode),
  });
}
