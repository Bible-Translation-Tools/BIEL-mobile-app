import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Platform } from 'react-native';

import { SplashScreenView } from '@/components/splash-screen';
import { resolveAppLocale, type AppLocale } from '@/constants/locale';
import { ensureOfflineRootExists } from '@/constants/offline-storage';
import { AppearanceProvider, useColorScheme } from '@/contexts/appearance-context';
import { LocaleProvider } from '@/contexts/locale-context';
import { initDatabase } from '@/db';
import { loadLocalePreference } from '@/db/locale-preferences';
import { i18n, initI18n } from '@/i18n';
import { resolveDeviceLocale } from '@/i18n/resolve-device-locale';
import { initDownloadNotifications } from '@/services/download-notification-service';
import { loadLanguageCatalog } from '@/services/language-catalog';
import { initPlaybackAppLifecycle } from '@/services/track-player/app-lifecycle';
import { setupTrackPlayer } from '@/services/track-player/setup';
import { initAudioVolumeStore } from '@/stores/audio-volume-store';
import { initReadingTextSettingsStore } from '@/stores/reading-text-settings-store';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return initPlaybackAppLifecycle();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialLocale, setInitialLocale] = useState<AppLocale | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();

        const savedLocale = await loadLocalePreference();
        const resolvedLocale = resolveAppLocale(
          savedLocale ?? resolveDeviceLocale(),
        );
        await initI18n(resolvedLocale);
        setInitialLocale(resolvedLocale);

        await Promise.all([
          initReadingTextSettingsStore(),
          initAudioVolumeStore(),
          initDownloadNotifications(),
          Platform.OS !== 'web' ? setupTrackPlayer() : Promise.resolve(),
        ]);
        await ensureOfflineRootExists();
        await loadLanguageCatalog();
      } finally {
        setAppReady(true);
        await ExpoSplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appReady || initialLocale == null) {
    return <SplashScreenView />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleProvider initialLocale={initialLocale}>
        <AppearanceProvider>
          <RootNavigation />
        </AppearanceProvider>
      </LocaleProvider>
    </I18nextProvider>
  );
}
