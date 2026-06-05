import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextSettingsStepper } from '@/components/reading/text-settings-stepper';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DownloadMenuLayout, TextSettingsLayout, Typography } from '@/constants/theme';
import { useReadingTextSettingsActions } from '@/contexts/reading-text-settings-context';
import { useTheme } from '@/hooks/use-theme';

export const TextSettingsMenu = memo(function TextSettingsMenu() {
  const theme = useTheme();
  const {
    increaseTextSize,
    decreaseTextSize,
    increaseLineHeight,
    decreaseLineHeight,
    reset,
    canDecreaseTextSize,
    canIncreaseTextSize,
    canDecreaseLineHeight,
    canIncreaseLineHeight,
    isDefault,
  } = useReadingTextSettingsActions();

  return (
    <View
      style={[
        styles.menu,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        styles.menuShadow,
      ]}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>Text Settings</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <IconSymbol
            name={{ ios: 'textformat.size', android: 'format-size', web: 'format-size' }}
            size={TextSettingsLayout.rowIconSize}
            color={theme.iconPrimary}
          />
          <Text style={[styles.rowTitle, { color: theme.text }]}>Text Size</Text>
        </View>
        <TextSettingsStepper
          onDecrease={decreaseTextSize}
          onIncrease={increaseTextSize}
          decreaseDisabled={!canDecreaseTextSize}
          increaseDisabled={!canIncreaseTextSize}
          decreaseLabel="Decrease text size"
          increaseLabel="Increase text size"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <IconSymbol
            name={{
              ios: 'arrow.up.and.down.text.horizontal',
              android: 'format-line-spacing',
              web: 'format-line-spacing',
            }}
            size={TextSettingsLayout.rowIconSize}
            color={theme.iconPrimary}
          />
          <Text style={[styles.rowTitle, { color: theme.text }]}>Line Height</Text>
        </View>
        <TextSettingsStepper
          onDecrease={decreaseLineHeight}
          onIncrease={increaseLineHeight}
          decreaseDisabled={!canDecreaseLineHeight}
          increaseDisabled={!canIncreaseLineHeight}
          decreaseLabel="Decrease line height"
          increaseLabel="Increase line height"
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={reset}
        disabled={isDefault}
        accessibilityRole="button"
        accessibilityLabel="Reset text settings"
        accessibilityState={{ disabled: isDefault }}>
        <Text
          style={[
            styles.resetText,
            { color: isDefault ? theme.textPlaceholder : theme.tabActive },
          ]}>
          Reset
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  menu: {
    borderRadius: DownloadMenuLayout.menuRadius,
    borderWidth: 1,
    padding: DownloadMenuLayout.menuPadding,
    gap: DownloadMenuLayout.menuGap,
    width: TextSettingsLayout.menuWidth,
  },
  menuShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 8,
  },
  title: {
    ...Typography.headingH7,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TextSettingsLayout.rowGap,
    width: '100%',
  },
  rowLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: TextSettingsLayout.rowGap,
    minWidth: 0,
  },
  rowTitle: {
    ...Typography.bodyMdSemibold,
    flexShrink: 1,
  },
  resetButton: {
    alignSelf: 'flex-end',
    height: TextSettingsLayout.resetHeight,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
});
