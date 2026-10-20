import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * A reader restored at launch replaces itself with its parent screen, leaving no history. Android
 * system Back there would close the app, so send it Home instead.
 */
export function useBackToHomeWithoutHistory(): void {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) return false;
        router.replace('/');
        return true;
      });
      return () => subscription.remove();
    }, [router]),
  );
}
