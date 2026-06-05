import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { MediaPlayerLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MediaPlayerControlsProps = {
  passage?: string;
  isPlaying?: boolean;
  isLoading?: boolean;
  error?: string | null;
  canStepVerse?: boolean;
  playIconSize?: number;
  onTogglePlay?: () => void;
  onPreviousVerse?: () => void;
  onNextVerse?: () => void;
};

const VOLUME_PLACEHOLDER = 0.5;

export function MediaPlayerControls({
  passage,
  isPlaying = false,
  isLoading = false,
  error,
  canStepVerse = false,
  playIconSize = 24,
  onTogglePlay,
  onPreviousVerse,
  onNextVerse,
}: MediaPlayerControlsProps) {
  const theme = useTheme();
  const playDisabled = isLoading || Boolean(error);

  return (
    <View style={styles.playBar}>
      <View style={styles.controlsRow}>
        <Pressable
          onPress={onPreviousVerse}
          disabled={!canStepVerse}
          style={({ pressed }) => [
            styles.verseControl,
            { opacity: !canStepVerse ? 0.4 : pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Previous verse"
          accessibilityState={{ disabled: !canStepVerse }}>
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
              size={playIconSize}
              color="#ffffff"
            />
          )}
        </Pressable>

        <Pressable
          onPress={onNextVerse}
          disabled={!canStepVerse}
          style={({ pressed }) => [
            styles.verseControl,
            { opacity: !canStepVerse ? 0.4 : pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next verse"
          accessibilityState={{ disabled: !canStepVerse }}>
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
        <Text style={[styles.passage, { color: theme.text }]} numberOfLines={2}>
          {passage}
        </Text>
      ) : null}

      <View style={styles.volumeRow} accessibilityRole="adjustable" accessibilityLabel="Volume">
        <IconSymbol
          name={{ ios: 'speaker.wave.1.fill', android: 'volume-mute', web: 'volume-mute' }}
          size={16}
          color={theme.iconPrimary}
        />
        <View style={[styles.volumeTrack, { backgroundColor: theme.background }]}>
          <View
            style={[
              styles.volumeFill,
              { backgroundColor: theme.tabActive, width: `${VOLUME_PLACEHOLDER * 100}%` },
            ]}
          />
        </View>
        <IconSymbol
          name={{ ios: 'speaker.wave.3.fill', android: 'volume-up', web: 'volume-up' }}
          size={16}
          color={theme.iconPrimary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playBar: {
    alignItems: 'center',
    gap: MediaPlayerLayout.playBarGap,
    width: '100%',
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
    ...Typography.bodyXs,
    fontWeight: '500',
    lineHeight: 12,
  },
  playButton: {
    width: MediaPlayerLayout.playButtonSize,
    height: MediaPlayerLayout.playButtonSize,
    borderRadius: MediaPlayerLayout.playButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passage: {
    ...Typography.headingH6,
    fontWeight: '400',
    textAlign: 'center',
    width: '100%',
  },
  errorText: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
  volumeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    borderRadius: 5,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 5,
  },
});
