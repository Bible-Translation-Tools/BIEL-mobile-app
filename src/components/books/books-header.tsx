import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BooksHeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export function BooksHeader({ searchQuery, onSearchChange }: BooksHeaderProps) {
  const theme = useTheme();
  const searchInputRef = useRef<TextInput>(null);
  const { t } = useTranslation('books');
  const { t: tc } = useTranslation('common');

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.textHeading }]}>{t('title')}</Text>

      <Pressable
        accessible={false}
        onPress={() => searchInputRef.current?.focus()}
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.borderSecondary,
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
          placeholderTextColor={theme.textPlaceholder}
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: BookLayout.headerGap,
    width: '100%',
  },
  title: {
    ...Typography.headingH4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BookLayout.headerGap,
    padding: 10,
    borderRadius: BookLayout.cardRadius,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
