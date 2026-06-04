import { useRef } from 'react';
import { PanResponder, StyleSheet, View, type DimensionValue } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';

type VolumeSliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
};

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function VolumeSlider({ value, onValueChange, accessibilityLabel }: VolumeSliderProps) {
  const theme = useTheme();
  const trackWidthRef = useRef(0);

  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const setVolumeFromXRef = useRef((x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    onValueChangeRef.current(clampVolume(x / width));
  });
  setVolumeFromXRef.current = (x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    onValueChangeRef.current(clampVolume(x / width));
  };

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => setVolumeFromXRef.current(event.nativeEvent.locationX),
      onPanResponderMove: (event) => setVolumeFromXRef.current(event.nativeEvent.locationX),
    }),
  );

  const fillWidth: DimensionValue = `${clampVolume(value) * 100}%`;
  const muted = value <= 0.001;

  return (
    <View
      style={styles.volumeRow}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampVolume(value) * 100),
        text: `${Math.round(clampVolume(value) * 100)}%`,
      }}>
      <IconSymbol
        name={
          muted
            ? { ios: 'speaker.slash.fill', android: 'volume-off', web: 'volume-off' }
            : { ios: 'speaker.wave.1.fill', android: 'volume-mute', web: 'volume-mute' }
        }
        size={16}
        color={theme.iconPrimary}
      />
      <View
        style={styles.trackHitArea}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
        {...panResponderRef.current.panHandlers}>
        <View style={[styles.volumeTrack, { backgroundColor: theme.background }]}>
          <View
            style={[styles.volumeFill, { backgroundColor: theme.tabActive, width: fillWidth }]}
          />
        </View>
      </View>
      <IconSymbol
        name={{ ios: 'speaker.wave.3.fill', android: 'volume-up', web: 'volume-up' }}
        size={16}
        color={theme.iconPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  volumeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackHitArea: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
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
