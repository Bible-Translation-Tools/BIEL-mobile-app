import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextSettingsLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextSettingsStepperProps = {
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
};

export const TextSettingsStepper = memo(function TextSettingsStepper({
  onDecrease,
  onIncrease,
  decreaseDisabled = false,
  increaseDisabled = false,
  decreaseLabel,
  increaseLabel,
}: TextSettingsStepperProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.stepper,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <Pressable
        style={({ pressed }) => [
          styles.step,
          styles.stepDivider,
          { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={onDecrease}
        disabled={decreaseDisabled}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        accessibilityState={{ disabled: decreaseDisabled }}>
        <IconSymbol
          name={{ ios: 'minus', android: 'remove', web: 'remove' }}
          size={TextSettingsLayout.stepperIconSize}
          color={decreaseDisabled ? theme.textPlaceholder : theme.iconPrimary}
        />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.step, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onIncrease}
        disabled={increaseDisabled}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        accessibilityState={{ disabled: increaseDisabled }}>
        <IconSymbol
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={TextSettingsLayout.stepperIconSize}
          color={increaseDisabled ? theme.textPlaceholder : theme.iconPrimary}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TextSettingsLayout.stepperHeight,
    borderRadius: TextSettingsLayout.stepperRadius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  step: {
    height: '100%',
    paddingHorizontal: TextSettingsLayout.stepperPaddingH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDivider: {
    borderRightWidth: 1,
  },
});
