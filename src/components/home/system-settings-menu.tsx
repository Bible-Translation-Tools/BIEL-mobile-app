import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ThemePreference } from '@/constants/appearance';
import { DownloadMenuLayout, SystemSettingsLayout, Typography } from '@/constants/theme';
import { useAppearance } from '@/contexts/appearance-context';
import { useTheme } from '@/hooks/use-theme';

type ThemeOption = {
  value: ThemePreference;
  title: string;
  subtitle: string;
  icon: {
    ios: string;
    android: string;
    web: string;
  };
  iconSize: number;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'system',
    title: 'Automatic',
    subtitle: 'Follow system settings',
    icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
    iconSize: SystemSettingsLayout.optionIconSize,
  },
  {
    value: 'light',
    title: 'Light Mode',
    subtitle: 'Ignore system settings',
    icon: { ios: 'sun.max', android: 'light-mode', web: 'light-mode' },
    iconSize: SystemSettingsLayout.themeIconSize,
  },
  {
    value: 'dark',
    title: 'Dark Mode',
    subtitle: 'Ignore system settings',
    icon: { ios: 'moon', android: 'dark-mode', web: 'dark-mode' },
    iconSize: SystemSettingsLayout.themeIconSize,
  },
];

export const SystemSettingsMenu = memo(function SystemSettingsMenu() {
  const theme = useTheme();
  const { themePreference, setThemePreference } = useAppearance();

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
      <Text style={[styles.title, { color: theme.textSecondary }]}>System Settings</Text>

      {THEME_OPTIONS.map((option) => {
        const selected = themePreference === option.value;

        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: selected ? theme.textLabel : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => setThemePreference(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}, ${option.subtitle}`}
            accessibilityState={{ selected }}>
            <IconSymbol name={option.icon} size={option.iconSize} color={theme.iconPrimary} />
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>{option.title}</Text>
              <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                {option.subtitle}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  menu: {
    width: '100%',
    borderRadius: DownloadMenuLayout.menuRadius,
    borderWidth: 1,
    padding: DownloadMenuLayout.menuPadding,
    gap: DownloadMenuLayout.menuGap,
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DownloadMenuLayout.optionGap,
    minHeight: SystemSettingsLayout.optionMinHeight,
    padding: DownloadMenuLayout.optionPadding,
    borderRadius: DownloadMenuLayout.optionRadius,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  optionTitle: {
    ...Typography.headingH7,
  },
  optionSubtitle: {
    ...Typography.bodyXs,
  },
});
