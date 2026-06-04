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
  enabled?: boolean;
  onComplete?: () => void;
  onDeleteComplete?: () => void;
};

export function useBookDownload({
  languageCode,
  bookSlug,
  enabled = true,
  onComplete,
  onDeleteComplete,
}: UseBookDownloadOptions) {
  const { t } = useTranslation('download');
  const {
    deleteDownload: deleteScriptureDownload,
    ...rest
  } = useContentDownload({
    enabled,
    downloadFailedMessage: t('couldNotDownloadScripture'),
    deleteFailedMessage: t('couldNotRemoveScripture'),
    onComplete,
    onDeleteComplete,
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
