import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPlayerControls } from '@/components/reading/media-player-controls';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MediaPlayerLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MediaPlayerPanelProps = {
  passage?: string;
  isPlaying?: boolean;
  isLoading?: boolean;
  error?: string | null;
  /** Whether verse-step controls have timing data available. */
  canStepVerse?: boolean;
  onClose: () => void;
  onTogglePlay?: () => void;
  onPreviousVerse?: () => void;
  onNextVerse?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onHeightChange?: (height: number) => void;
};

export function MediaPlayerPanel({
  passage,
  isPlaying = false,
  isLoading = false,
  error,
  canStepVerse = false,
  onClose,
  onTogglePlay,
  onPreviousVerse,
  onNextVerse,
  volume,
  onVolumeChange,
  onHeightChange,
}: MediaPlayerPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation('reading');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          paddingBottom: MediaPlayerLayout.paddingV + insets.bottom,
        },
      ]}
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      accessibilityRole="toolbar"
      accessibilityLabel={t('audioPlayer')}>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('closeAudioPlayer')}>
        <IconSymbol
          name={{ ios: 'xmark', android: 'close', web: 'close' }}
          size={24}
          color={theme.iconPrimary}
        />
      </Pressable>

      <View style={styles.playBar}>
        <MediaPlayerControls
          passage={passage}
          isPlaying={isPlaying}
          isLoading={isLoading}
          error={error}
          canStepVerse={canStepVerse}
          onTogglePlay={onTogglePlay}
          onPreviousVerse={onPreviousVerse}
          onNextVerse={onNextVerse}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Avoid sub-pixel seam where content can peek under the panel.
    bottom: -1,
    borderTopWidth: 1,
    borderTopLeftRadius: MediaPlayerLayout.topRadius,
    borderTopRightRadius: MediaPlayerLayout.topRadius,
    paddingHorizontal: MediaPlayerLayout.paddingH,
    paddingTop: MediaPlayerLayout.paddingV,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: MediaPlayerLayout.closeHitArea,
    height: MediaPlayerLayout.closeHitArea,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  playBar: {
    paddingHorizontal: MediaPlayerLayout.playBarPaddingH,
  },
});
