import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  SUPPORTED_LOCALE_CODES,
  SUPPORTED_LOCALES,
  type AppLocale,
} from '@/constants/locale';
import { DownloadMenuLayout, SystemSettingsLayout, Typography } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';

type LocaleMenuProps = {
  onSelect?: () => void;
};

export const LocaleMenu = memo(function LocaleMenu({ onSelect }: LocaleMenuProps) {
  const theme = useTheme();
  const { uiLocale, setUiLocale } = useLocale();
  const { t } = useTranslation('locale');

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
      <Text style={[styles.title, { color: theme.textSecondary }]}>{t('pickerTitle')}</Text>

      {SUPPORTED_LOCALE_CODES.map((code) => {
        const selected = uiLocale === code;
        const { nativeLabel } = SUPPORTED_LOCALES[code as AppLocale];

        return (
          <Pressable
            key={code}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: selected ? theme.textLabel : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              setUiLocale(code);
              onSelect?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={nativeLabel}
            accessibilityState={{ selected }}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>{nativeLabel}</Text>
            {selected ? (
              <IconSymbol
                name={{
                  ios: 'checkmark',
                  android: 'check',
                  web: 'check',
                }}
                size={SystemSettingsLayout.optionIconSize}
                color={theme.tabActive}
              />
            ) : null}
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
    justifyContent: 'space-between',
    gap: DownloadMenuLayout.optionGap,
    minHeight: SystemSettingsLayout.optionMinHeight,
    padding: DownloadMenuLayout.optionPadding,
    borderRadius: DownloadMenuLayout.optionRadius,
    borderWidth: 1,
  },
  optionTitle: {
    ...Typography.headingH7,
    flex: 1,
  },
});
