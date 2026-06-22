import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ContentDownloadError } from '@/hooks/use-content-download';

let activeAlertKey: string | null = null;

function buildAlertKey(error: ContentDownloadError): string {
  return `${error.title}\0${error.message}`;
}

export function useDownloadErrorAlert(
  error: ContentDownloadError | null,
  clearError: () => void,
): void {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!error) return;

    const key = buildAlertKey(error);
    if (activeAlertKey === key) return;
    activeAlertKey = key;

    Alert.alert(error.title, error.message, [
      {
        text: t('ok'),
        onPress: () => {
          activeAlertKey = null;
          clearError();
        },
      },
    ]);
  }, [clearError, error, t]);
}
