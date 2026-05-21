import { Dimensions, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { BookFillIcon } from '@/components/icons/book-fill-icon';
import { WaLogo } from '@/components/icons/wa-logo';
import { Splash, SplashDesign } from '@/constants/theme';

export function SplashScreenView() {
  const { width } = Dimensions.get('window');
  const scale = width / SplashDesign.frameWidth;
  const padding = SplashDesign.padding * scale;
  const bookSize = SplashDesign.bookSize * scale;
  const logoWidth = SplashDesign.logoWidth * scale;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.content, { padding }]}>
        <View style={styles.graphic}>
          <BookFillIcon size={bookSize} />
        </View>
        <WaLogo width={logoWidth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Splash.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphic: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
