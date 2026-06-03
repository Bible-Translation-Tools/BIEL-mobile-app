import { useTranslation } from 'react-i18next';

import {
  deleteBookScripture,
  downloadBookScripture,
  getBookScriptureFileSizeBytes,
  getDownloadedBookByteSize,
} from '@/api/services/offline-text';
import { useContentDownload } from '@/hooks/use-content-download';

type UseBookDownloadOptions = {
  languageCode: string;
  bookSlug: string;
  onComplete?: () => void;
};

export function useBookDownload({
  languageCode,
  bookSlug,
  onComplete,
}: UseBookDownloadOptions) {
  const { t } = useTranslation('download');
  const {
    deleteDownload: deleteScriptureDownload,
    ...rest
  } = useContentDownload({
    downloadFailedMessage: t('couldNotDownloadScripture'),
    deleteFailedMessage: t('couldNotRemoveScripture'),
    onComplete,
    download: (options) => downloadBookScripture(languageCode, bookSlug, options),
    deleteContent: () => deleteBookScripture(languageCode, bookSlug),
    getDownloadedBytes: () => getDownloadedBookByteSize(languageCode, bookSlug),
    getTotalBytes: () => getBookScriptureFileSizeBytes(languageCode, bookSlug),
  });

  return {
    ...rest,
    deleteScriptureDownload,
  };
}
