import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  LibraryFilterPopover,
  type LibraryFilterAnchor,
} from '@/components/download/library-filter-popover';
import { FILTER_LIST_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { DownloadsLibraryLayout, HomeLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LibraryContentFilter } from '@/types/content-type';

type DownloadsLibraryHeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  contentFilter: LibraryContentFilter;
  onContentFilterChange: (filter: LibraryContentFilter) => void;
};

export function DownloadsLibraryHeader({
  searchQuery,
  onSearchChange,
  contentFilter,
  onContentFilterChange,
}: DownloadsLibraryHeaderProps) {
  const theme = useTheme();
  const searchInputRef = useRef<TextInput>(null);
  const filterAnchorRef = useRef<View>(null);
  const { t } = useTranslation('library');
  const { t: tc } = useTranslation('common');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState<LibraryFilterAnchor | null>(null);

  const openFilter = () => {
    filterAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setFilterAnchor({ x, y, width, height });
      setFilterVisible(true);
    });
  };

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.textHeading }]}>{t('title')}</Text>

      <View style={styles.searchRow}>
        <Pressable
          accessible={false}
          onPress={() => searchInputRef.current?.focus()}
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <IconSymbol
            name={{ ios: 'magnifyingglass', android: 'search' }}
            size={28}
            color={theme.iconTertiary}
          />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={theme.textLabel}
            style={[styles.searchInput, { color: theme.text }]}
            accessibilityLabel={t('searchAccessibility')}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onSearchChange('');
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tc('clearSearch')}>
              <IconSymbol
                name={{ ios: 'xmark.circle.fill', android: 'cancel' }}
                size={20}
                color={theme.iconTertiary}
              />
            </Pressable>
          )}
        </Pressable>

        <View ref={filterAnchorRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
              contentFilter !== 'all' && { backgroundColor: theme.backgroundSelected },
            ]}
            onPress={openFilter}
            accessibilityRole="button"
            accessibilityLabel={t('filterAccessibility')}
            accessibilityState={{ expanded: filterVisible }}>
            <IconSymbol
              name={FILTER_LIST_ICON_NAME}
              size={DownloadsLibraryLayout.filterIconSize}
              color={theme.iconPrimary}
            />
          </Pressable>
        </View>
      </View>

      <LibraryFilterPopover
        visible={filterVisible}
        anchor={filterAnchor}
        value={contentFilter}
        onSelect={onContentFilterChange}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: HomeLayout.headerGap,
    width: '100%',
    paddingHorizontal: HomeLayout.padding,
    paddingBottom: HomeLayout.headerGap,
  },
  title: {
    ...Typography.headingH4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.headerGap,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.headerGap,
    padding: 10,
    borderRadius: HomeLayout.cardRadius,
    borderWidth: 1,
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterButton: {
    width: DownloadsLibraryLayout.filterButtonSize,
    height: DownloadsLibraryLayout.filterButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HomeLayout.cardRadius,
    borderWidth: 1,
  },
});
