import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BooksHeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export function BooksHeader({ searchQuery, onSearchChange }: BooksHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.textHeading }]}>Bible</Text>

      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.borderSecondary,
          },
        ]}>
        <IconSymbol
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={28}
          color={theme.iconTertiary}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search book here..."
          placeholderTextColor={theme.textPlaceholder}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel="Search books"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => onSearchChange('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <IconSymbol
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={20}
              color={theme.iconTertiary}
            />
          </Pressable>
        )}
      </View>
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
