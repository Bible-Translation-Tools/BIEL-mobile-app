import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { SplashScreenView } from '@/components/splash-screen';
import { AppearanceProvider, useColorScheme } from '@/contexts/appearance-context';
import { ensureOfflineRootExists } from '@/constants/offline-storage';
import { initDatabase } from '@/db';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        await ensureOfflineRootExists();
        // Hold splash briefly so the native splash transitions into the in-app splash.
        await new Promise((resolve) => setTimeout(resolve, 300));
      } finally {
        setAppReady(true);
        await ExpoSplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appReady) {
    return <SplashScreenView />;
  }

  return (
    <AppearanceProvider>
      <RootNavigation />
    </AppearanceProvider>
  );
}
