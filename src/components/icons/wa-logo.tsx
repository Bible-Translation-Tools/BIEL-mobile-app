import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Splash, SplashDesign } from '@/constants/theme';

import { WaLogoIcon } from './wa-logo-icon';
import { WaLogoWordmark } from './wa-logo-wordmark';

const ICON_WIDTH_RATIO = 40 / SplashDesign.logoWidth;
const TEXT_WIDTH_RATIO = 46.6673 / SplashDesign.logoWidth;
const TEXT_HEIGHT_RATIO = 22.3861 / SplashDesign.logoHeight;
const TEXT_BOTTOM_INSET_RATIO = 0.1524;

type WaLogoProps = {
  width: number;
  style?: StyleProp<ViewStyle>;
};

export function WaLogo({ width, style }: WaLogoProps) {
  const height = width * (SplashDesign.logoHeight / SplashDesign.logoWidth);
  const iconWidth = width * ICON_WIDTH_RATIO;
  const textWidth = width * TEXT_WIDTH_RATIO;
  const textHeight = height * TEXT_HEIGHT_RATIO;
  const textBottomInset = height * TEXT_BOTTOM_INSET_RATIO;

  return (
    <View style={[styles.container, { width, height, opacity: Splash.logoOpacity }, style]}>
      <WaLogoIcon width={iconWidth} height={height} />
      <View style={[styles.wordmark, { paddingBottom: textBottomInset }]}>
        <WaLogoWordmark width={textWidth} height={textHeight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wordmark: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
});
