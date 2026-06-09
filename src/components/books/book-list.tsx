import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  type ListRenderItem,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { BookLayout } from '@/constants/theme';
import { useBookChapters } from '@/hooks/use-book-chapters';
import { useTheme } from '@/hooks/use-theme';
import type { BookDownloadStatusChange } from '@/hooks/use-books';
import type { BookItem, ChapterItem } from '@/types/book';

import { BookCardRow } from './book-card-row';

type BookListProps = {
  books: BookItem[];
  languageCode: string;
  audioOnly: boolean;
  languageHasAudio: boolean;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onChapterPress?: (book: BookItem, chapter: ChapterItem) => void;
  onDownloadStatusChange?: (change: BookDownloadStatusChange) => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

type BookListEmptyProps = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRetry?: () => void;
};

function BookListEmpty({ loading, refreshing, error, onRetry }: BookListEmptyProps) {
  const theme = useTheme();
  const { t } = useTranslation('books');
  const { t: tc } = useTranslation('common');

  if (loading && !refreshing) {
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
            {tc('retry')}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{t('noBooksFound')}</Text>
    </View>
  );
}

export function BookList({
  books,
  languageCode,
  audioOnly,
  languageHasAudio,
  loading,
  error = null,
  onRetry,
  onChapterPress,
  onDownloadStatusChange,
  onRefresh,
  refreshing = false,
  ListHeaderComponent,
  contentContainerStyle,
}: BookListProps) {
  const theme = useTheme();
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const { loadChapters, getChapters, isLoading, clearCache } = useBookChapters(languageCode, audioOnly);

  const expandedBook = books.find((book) => book.id === expandedBookId);

  useEffect(() => {
    setExpandedBookId(null);
  }, [languageCode]);

  useEffect(() => {
    if (expandedBookId && !books.some((book) => book.id === expandedBookId)) {
      setExpandedBookId(null);
    }
  }, [books, expandedBookId]);

  useEffect(() => {
    if (expandedBook) {
      loadChapters(expandedBook.slug);
    }
  }, [expandedBook, loadChapters]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    clearCache();
    await onRefresh();
  }, [clearCache, onRefresh]);

  const renderItem: ListRenderItem<BookItem> = useCallback(
    ({ item }) => {
      const isExpanded = expandedBookId === item.id;

      return (
        <BookCardRow
          book={item}
          languageCode={languageCode}
          audioOnly={audioOnly}
          languageHasAudio={languageHasAudio}
          isExpanded={isExpanded}
          chapters={getChapters(item.slug)}
          chaptersLoading={isLoading(item.slug)}
          onToggleExpand={() => {
            Keyboard.dismiss();
            const willExpand = expandedBookId !== item.id;
            if (willExpand) {
              void loadChapters(item.slug);
            }
            setExpandedBookId((current) => (current === item.id ? null : item.id));
          }}
          onChapterPress={
            onChapterPress
              ? (chapter) => {
                  Keyboard.dismiss();
                  onChapterPress(item, chapter);
                }
              : undefined
          }
          onDownloadStatusChange={onDownloadStatusChange}
        />
      );
    },
    [
      expandedBookId,
      getChapters,
      isLoading,
      languageCode,
      audioOnly,
      languageHasAudio,
      loadChapters,
      onChapterPress,
      onDownloadStatusChange,
    ],
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
        <BookListEmpty
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRetry={onRetry}
        />
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.iconPrimary}
            colors={[theme.tabActive]}
          />
        ) : undefined
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
