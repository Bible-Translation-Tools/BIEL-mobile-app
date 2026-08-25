import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  SUBJECT_ICON_NAME,
  VOLUME_UP_ICON_NAME,
  IconSymbol,
} from '@/components/ui/icon-symbol';
import { DownloadMenuLayout, DownloadsLibraryLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LibraryContentFilter } from '@/types/content-type';

const FILTER_OPTIONS: Exclude<LibraryContentFilter, 'all'>[] = ['both', 'scripture', 'audio'];

type LibraryFilterMenuProps = {
  value: LibraryContentFilter;
  onSelect: (value: LibraryContentFilter) => void;
};

function FilterOptionIcons({ option }: { option: Exclude<LibraryContentFilter, 'all'> }) {
  const theme = useTheme();
  const iconSize = DownloadsLibraryLayout.filterOptionIconSize;
  const color = theme.iconPrimary;

  if (option === 'both') {
    return (
      <View style={styles.icons}>
        <IconSymbol name={SUBJECT_ICON_NAME} size={iconSize} color={color} />
        <IconSymbol name={VOLUME_UP_ICON_NAME} size={iconSize} color={color} />
      </View>
    );
  }

  if (option === 'scripture') {
    return <IconSymbol name={SUBJECT_ICON_NAME} size={iconSize} color={color} />;
  }

  return <IconSymbol name={VOLUME_UP_ICON_NAME} size={iconSize} color={color} />;
}

export const LibraryFilterMenu = memo(function LibraryFilterMenu({
  value,
  onSelect,
}: LibraryFilterMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation('library');
  const isDefault = value === 'all';

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
      <Text style={[styles.title, { color: theme.textSecondary }]}>{t('filterTitle')}</Text>
      {FILTER_OPTIONS.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            style={({ pressed }) => [
              styles.option,
              selected && { backgroundColor: theme.backgroundSelected },
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => onSelect(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <FilterOptionIcons option={option} />
            <Text style={[styles.optionLabel, { color: theme.text }]}>{t(`filter.${option}`)}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => onSelect('all')}
        disabled={isDefault}
        accessibilityRole="button"
        accessibilityLabel={t('resetFilter')}
        accessibilityState={{ disabled: isDefault }}>
        <Text
          style={[
            styles.resetText,
            { color: isDefault ? theme.textPlaceholder : theme.tabActive },
          ]}>
          {t('reset')}
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
    alignItems: 'flex-end',
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
    alignSelf: 'stretch',
  },
  option: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: DownloadsLibraryLayout.filterOptionGap,
    minHeight: 44,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  resetButton: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
});
