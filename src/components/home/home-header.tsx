import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BookHeaderIcon } from '@/components/icons/book-header-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { HomeLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type HomeHeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export function HomeHeader({ searchQuery, onSearchChange }: HomeHeaderProps) {
  const theme = useTheme();
  const searchInputRef = useRef<TextInput>(null);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <BookHeaderIcon size={HomeLayout.bookIconSize} />
        <Text style={[styles.title, { color: theme.text }]}>Browse the Bible</Text>
      </View>

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
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={28}
          color={theme.iconTertiary}
        />
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search language here..."
          placeholderTextColor={theme.textLabel}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel="Search languages"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onSearchChange('');
            }}
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
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: HomeLayout.headerGap,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: HomeLayout.headerGap,
  },
  title: {
    ...Typography.headingH4,
    flexShrink: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.headerGap,
    padding: 10,
    borderRadius: HomeLayout.cardRadius,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
