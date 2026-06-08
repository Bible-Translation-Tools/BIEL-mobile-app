import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { VolumeSlider } from '@/components/reading/volume-slider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MediaPlayerLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MediaPlayerControlsProps = {
  passage?: string;
  isPlaying?: boolean;
  isLoading?: boolean;
  error?: string | null;
  canStepVerse?: boolean;
  volume?: number;
  playIconSize?: number;
  onTogglePlay?: () => void;
  onPreviousVerse?: () => void;
  onNextVerse?: () => void;
  onVolumeChange?: (volume: number) => void;
};

export function MediaPlayerControls({
  passage,
  isPlaying = false,
  isLoading = false,
  error,
  canStepVerse = false,
  volume = 1,
  playIconSize = 24,
  onTogglePlay,
  onPreviousVerse,
  onNextVerse,
  onVolumeChange,
}: MediaPlayerControlsProps) {
  const theme = useTheme();
  const { t } = useTranslation('reading');
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
          accessibilityLabel={t('previousVerse')}
          accessibilityState={{ disabled: !canStepVerse }}>
          <IconSymbol
            name={{
              ios: 'backward.end.fill',
              android: 'skip-previous',
            }}
            size={36}
            color={theme.iconPrimary}
          />
          <Text style={[styles.verseLabel, { color: theme.text }]}>{t('verse')}</Text>
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
          accessibilityLabel={isPlaying ? t('pause') : t('play')}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <IconSymbol
              name={
                isPlaying
                  ? { ios: 'pause.fill', android: 'pause' }
                  : { ios: 'play.fill', android: 'play-arrow' }
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
          accessibilityLabel={t('nextVerse')}
          accessibilityState={{ disabled: !canStepVerse }}>
          <IconSymbol
            name={{ ios: 'forward.end.fill', android: 'skip-next' }}
            size={36}
            color={theme.iconPrimary}
          />
          <Text style={[styles.verseLabel, { color: theme.text }]}>{t('verse')}</Text>
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

      {onVolumeChange ? (
        <VolumeSlider
          value={volume}
          onValueChange={onVolumeChange}
          accessibilityLabel={t('volume')}
        />
      ) : null}
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
});
