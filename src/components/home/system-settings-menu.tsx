import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SETTINGS_ICON_NAME, IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import type { ThemePreference } from '@/constants/appearance';
import { DownloadMenuLayout, SystemSettingsLayout, Typography } from '@/constants/theme';
import { useAppearance } from '@/contexts/appearance-context';
import { useTheme } from '@/hooks/use-theme';

type ThemeOption = {
  value: ThemePreference;
  titleKey: string;
  subtitleKey: string;
  icon: IconSymbolName;
  iconSize: number;
};

const THEME_OPTION_CONFIG: ThemeOption[] = [
  {
    value: 'system',
    titleKey: 'theme.system.title',
    subtitleKey: 'theme.system.subtitle',
    icon: SETTINGS_ICON_NAME,
    iconSize: SystemSettingsLayout.optionIconSize,
  },
  {
    value: 'light',
    titleKey: 'theme.light.title',
    subtitleKey: 'theme.light.subtitle',
    icon: { ios: 'sun.max', android: 'light-mode' },
    iconSize: SystemSettingsLayout.themeIconSize,
  },
  {
    value: 'dark',
    titleKey: 'theme.dark.title',
    subtitleKey: 'theme.dark.subtitle',
    icon: { ios: 'moon', android: 'dark-mode' },
    iconSize: SystemSettingsLayout.themeIconSize,
  },
];

export const SystemSettingsMenu = memo(function SystemSettingsMenu() {
  const theme = useTheme();
  const { themePreference, setThemePreference } = useAppearance();
  const { t } = useTranslation('settings');

  const themeOptions = useMemo(
    () =>
      THEME_OPTION_CONFIG.map((option) => ({
        ...option,
        title: t(option.titleKey),
        subtitle: t(option.subtitleKey),
      })),
    [t],
  );

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
      <Text style={[styles.title, { color: theme.textSecondary }]}>{t('title')}</Text>

      {themeOptions.map((option) => {
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
