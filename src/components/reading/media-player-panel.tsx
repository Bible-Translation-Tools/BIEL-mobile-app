import { useState } from 'react';
import {
  ActivityIndicator,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { MediaPlayerLayout } from '@/constants/theme';
import { useSystemVolume } from '@/hooks/use-system-volume';
import { useTheme } from '@/hooks/use-theme';

type MediaPlayerPanelProps = {
  passage?: string;
  isPlaying?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onTogglePlay?: () => void;
  onPreviousVerse?: () => void;
  onNextVerse?: () => void;
};

export function MediaPlayerPanel({
  passage,
  isPlaying = false,
  isLoading = false,
  error,
  onClose,
  onTogglePlay,
  onPreviousVerse,
  onNextVerse,
}: MediaPlayerPanelProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { volume, setVolume } = useSystemVolume();
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handleTrackPress = (event: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    const x = event.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    setVolume(ratio);
  };

  const playDisabled = isLoading || Boolean(error);

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
      accessibilityRole="toolbar"
      accessibilityLabel="Audio player">
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Close audio player">
        <IconSymbol
          name={{ ios: 'xmark', android: 'close', web: 'close' }}
          size={24}
          color={theme.iconPrimary}
        />
      </Pressable>

      <View style={styles.playBar}>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={onPreviousVerse}
            style={({ pressed }) => [styles.verseControl, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous verse">
            <IconSymbol
              name={{
                ios: 'backward.end.fill',
                android: 'skip-previous',
                web: 'skip-previous',
              }}
              size={36}
              color={theme.iconPrimary}
            />
            <Text style={[styles.verseLabel, { color: theme.text }]}>Verse</Text>
          </Pressable>

          <Pressable
            onPress={onTogglePlay}
            disabled={playDisabled}
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: theme.tabActive,
                opacity: playDisabled ? 0.6 : pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: playDisabled }}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <IconSymbol
                name={
                  isPlaying
                    ? { ios: 'pause.fill', android: 'pause', web: 'pause' }
                    : { ios: 'play.fill', android: 'play-arrow', web: 'play-arrow' }
                }
                size={24}
                color="#ffffff"
              />
            )}
          </Pressable>

          <Pressable
            onPress={onNextVerse}
            style={({ pressed }) => [styles.verseControl, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Next verse">
            <IconSymbol
              name={{ ios: 'forward.end.fill', android: 'skip-next', web: 'skip-next' }}
              size={36}
              color={theme.iconPrimary}
            />
            <Text style={[styles.verseLabel, { color: theme.text }]}>Verse</Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: theme.iconDanger }]} numberOfLines={2}>
            {error}
          </Text>
        ) : passage ? (
          <Text style={[styles.passage, { color: theme.text }]} numberOfLines={1}>
            {passage}
          </Text>
        ) : null}

        <View style={styles.volumeRow}>
          <IconSymbol
            name={{ ios: 'speaker.wave.1.fill', android: 'volume-mute', web: 'volume-mute' }}
            size={16}
            color={theme.iconPrimary}
          />
          <Pressable
            style={styles.volumeTrackPress}
            onLayout={handleTrackLayout}
            onPress={handleTrackPress}
            accessibilityRole="adjustable"
            accessibilityLabel="Volume"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(volume * 100) }}>
            <View style={[styles.volumeTrack, { backgroundColor: theme.background }]}>
              <View
                style={[
                  styles.volumeFill,
                  { backgroundColor: theme.tabActive, width: `${volume * 100}%` },
                ]}
              />
            </View>
          </Pressable>
          <IconSymbol
            name={{ ios: 'speaker.wave.3.fill', android: 'volume-up', web: 'volume-up' }}
            size={16}
            color={theme.iconPrimary}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    alignItems: 'center',
    gap: MediaPlayerLayout.playBarGap,
    paddingHorizontal: MediaPlayerLayout.playBarPaddingH,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MediaPlayerLayout.controlsGap,
  },
  verseControl: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    width: MediaPlayerLayout.playButtonSize,
    height: MediaPlayerLayout.playButtonSize,
    borderRadius: MediaPlayerLayout.playButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passage: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  volumeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeTrackPress: {
    flex: 1,
    paddingVertical: 10,
  },
  volumeTrack: {
    height: 4,
    borderRadius: 5,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 5,
  },
});
