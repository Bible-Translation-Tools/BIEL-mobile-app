import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ContentDownloadError } from '@/hooks/use-content-download';

export function useDownloadErrorAlert(
  error: ContentDownloadError | null,
  clearError: () => void,
): void {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!error) return;

    Alert.alert(error.title, error.message, [{ text: t('ok'), onPress: clearError }]);
  }, [clearError, error, t]);
}
