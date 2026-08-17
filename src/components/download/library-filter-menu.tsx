import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LibraryContentFilter } from '@/types/content-type';

const FILTER_OPTIONS: LibraryContentFilter[] = ['all', 'scripture', 'audio', 'both'];

type LibraryFilterMenuProps = {
  value: LibraryContentFilter;
  onSelect: (value: LibraryContentFilter) => void;
};

export const LibraryFilterMenu = memo(function LibraryFilterMenu({
  value,
  onSelect,
}: LibraryFilterMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation('library');

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
            <Text style={[styles.optionLabel, { color: theme.text }]}>{t(`filter.${option}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  menu: {
    borderRadius: DownloadMenuLayout.menuRadius,
    borderWidth: 1,
    padding: 12,
    gap: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 16,
  },
});
