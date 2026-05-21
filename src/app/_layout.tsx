import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { SplashScreenView } from '@/components/splash-screen';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
