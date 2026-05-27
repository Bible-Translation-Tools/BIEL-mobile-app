import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  type ListRenderItem,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BookLayout } from '@/constants/theme';
import { useBookChapters } from '@/hooks/use-book-chapters';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem } from '@/types/book';

import { BookCardRow } from './book-card-row';

type BookListProps = {
  books: BookItem[];
  languageCode?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onChapterPress?: (book: BookItem, chapter: ChapterItem) => void;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

type BookListEmptyProps = {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
};

function BookListEmpty({ loading, error, onRetry }: BookListEmptyProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.iconPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{error}</Text>
        {onRetry ? (
          <Text style={[styles.retry, { color: theme.text }]} onPress={onRetry}>
            Tap to retry
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.message, { color: theme.textSecondary }]}>No books found</Text>
    </View>
  );
}

export function BookList({
  books,
  languageCode,
  loading = false,
  error = null,
  onRetry,
  onChapterPress,
  ListHeaderComponent,
  contentContainerStyle,
}: BookListProps) {
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const { loadChapters, getChapters, isLoading } = useBookChapters(languageCode);

  const expandedBook = books.find((book) => book.id === expandedBookId);

  useEffect(() => {
    setExpandedBookId(null);
  }, [books]);

  useEffect(() => {
    if (expandedBook) {
      loadChapters(expandedBook.slug);
    }
  }, [expandedBook, loadChapters]);

  const renderItem: ListRenderItem<BookItem> = useCallback(
    ({ item }) => {
      const isExpanded = expandedBookId === item.id;

      return (
        <BookCardRow
          book={item}
          isExpanded={isExpanded}
          chapters={getChapters(item.slug)}
          chaptersLoading={isLoading(item.slug)}
          onToggleExpand={() =>
            setExpandedBookId((current) => (current === item.id ? null : item.id))
          }
          onChapterPress={
            onChapterPress ? (chapter) => onChapterPress(item, chapter) : undefined
          }
        />
      );
    },
    [expandedBookId, getChapters, isLoading, onChapterPress],
  );

  const listHeader = ListHeaderComponent;

  return (
    <FlatList
      style={styles.list}
      data={books}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      extraData={expandedBookId}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <BookListEmpty loading={loading} error={error} onRetry={onRetry} />
      }
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      maxToRenderPerBatch={16}
      windowSize={7}
      updateCellsBatchingPeriod={50}
    />
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: BookLayout.padding,
    paddingBottom: 40,
  },
  separator: {
    height: BookLayout.listGap,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  retry: {
    fontSize: 16,
    fontWeight: '600',
  },
});
