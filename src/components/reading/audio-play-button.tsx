import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AudioPlayButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { bottom: ReadingLayout.playButtonBottom + insets.bottom }]}
      pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.backgroundElement,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Play audio">
        <IconSymbol name="speaker.wave.2.fill" size={28} color={theme.iconPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: ReadingLayout.playButtonSize,
    height: ReadingLayout.playButtonSize,
    borderRadius: ReadingLayout.playButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 0.5,
    elevation: 2,
  },
});
