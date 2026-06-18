import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  SUPPORTED_LOCALE_CODES,
  SUPPORTED_LOCALES,
  type AppLocale,
} from '@/constants/locale';
import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';

type LocaleMenuProps = {
  onSelect?: () => void;
};

const LocaleMenuLayout = {
  menuPadding: 12,
  menuGap: 16,
  optionGap: 12,
  optionPaddingV: 12,
  optionPaddingH: 12,
  optionMinHeight: 36,
  optionIconSize: 18,
  optionRadius: 8,
  optionsMaxHeight: 300,
} as const;

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

      <ScrollView
        style={styles.optionsScroll}
        contentContainerStyle={styles.optionsContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}>
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
                  }}
                  size={LocaleMenuLayout.optionIconSize}
                  color={theme.tabActive}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  menu: {
    width: '80%',
    borderRadius: DownloadMenuLayout.menuRadius,
    borderWidth: 1,
    padding: LocaleMenuLayout.menuPadding,
    gap: LocaleMenuLayout.menuGap,
  },
  menuShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 8,
  },
  title: {
    ...Typography.bodySm,
    fontWeight: '600',
    width: '100%',
  },
  optionsScroll: {
    maxHeight: LocaleMenuLayout.optionsMaxHeight,
  },
  optionsContent: {
    gap: LocaleMenuLayout.optionGap,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: LocaleMenuLayout.optionPaddingH,
    minHeight: LocaleMenuLayout.optionMinHeight,
    paddingVertical: LocaleMenuLayout.optionPaddingV,
    paddingHorizontal: LocaleMenuLayout.optionPaddingH,
    borderRadius: LocaleMenuLayout.optionRadius,
    borderWidth: 1,
  },
  optionTitle: {
    ...Typography.bodySm,
    fontWeight: '500',
    flex: 1,
  },
});
