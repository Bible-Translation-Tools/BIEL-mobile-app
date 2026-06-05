import { useEffect } from 'react';
import { Alert } from 'react-native';

import type { ContentDownloadError } from '@/hooks/use-content-download';

export function useDownloadErrorAlert(
  error: ContentDownloadError | null,
  clearError: () => void,
): void {
  useEffect(() => {
    if (!error) return;

    Alert.alert(error.title, error.message, [{ text: 'OK', onPress: clearError }]);
  }, [clearError, error]);
}
