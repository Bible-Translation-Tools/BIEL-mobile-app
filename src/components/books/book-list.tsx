import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  type ListRenderItem,
  View,
} from 'react-native';

import { AccordionGroupHeader } from '@/components/ui/accordion-group-header';
import { AccordionLayout, BookLayout } from '@/constants/theme';
import { useBookChapters } from '@/hooks/use-book-chapters';
import type { BookDownloadStatusChange } from '@/hooks/use-books';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem, Testament } from '@/types/book';

import { BookCardRow } from './book-card-row';

type BookListProps = {
  books: BookItem[];
  languageCode: string;
  audioOnly: boolean;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onChapterPress?: (book: BookItem, chapter: ChapterItem) => void;
  onDownloadStatusChange?: (change: BookDownloadStatusChange) => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  /** Open every testament group, e.g. while a search is active. */
  expandAllGroups?: boolean;
};

const TESTAMENTS: Testament[] = ['old', 'new'];

type BookListRow =
  | { type: 'group'; testament: Testament; first: boolean }
  | { type: 'book'; book: BookItem };

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
  loading,
  error = null,
  onRetry,
  onChapterPress,
  onDownloadStatusChange,
  onRefresh,
  refreshing = false,
  ListFooterComponent,
  expandAllGroups = false,
}: BookListProps) {
  const theme = useTheme();
  const { t } = useTranslation('books');
  const [expandedTestament, setExpandedTestament] = useState<Testament | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const { loadChapters, getChapters, isLoading, clearCache } = useBookChapters(
    languageCode,
    audioOnly,
  );

  const expandedBook = books.find((book) => book.id === expandedBookId);

  useEffect(() => {
    setExpandedBookId(null);
  }, [languageCode]);

  useEffect(() => {
    if (expandedBookId && !books.some((book) => book.id === expandedBookId)) {
      setExpandedBookId(null);
    }
  }, [books, expandedBookId]);

  // Like the Downloads Library, keep one group open: the current one, else the first with books.
  useEffect(() => {
    setExpandedTestament((current) => {
      if (current && books.some((book) => book.testament === current)) {
        return current;
      }
      return (
        TESTAMENTS.find((testament) => books.some((book) => book.testament === testament)) ?? null
      );
    });
  }, [books]);

  const rows = useMemo(() => {
    const result: BookListRow[] = [];
    for (const testament of TESTAMENTS) {
      const groupBooks = books.filter((book) => book.testament === testament);
      if (groupBooks.length === 0) continue;

      result.push({ type: 'group', testament, first: result.length === 0 });
      if (expandAllGroups || expandedTestament === testament) {
        for (const book of groupBooks) {
          result.push({ type: 'book', book });
        }
      }
    }
    return result;
  }, [books, expandAllGroups, expandedTestament]);

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

  const renderItem: ListRenderItem<BookListRow> = useCallback(
    ({ item: row }) => {
      if (row.type === 'group') {
        const expanded = expandAllGroups || expandedTestament === row.testament;
        return (
          <View style={!row.first && styles.groupSpacing}>
            <AccordionGroupHeader
              title={row.testament === 'old' ? t('oldTestament') : t('newTestament')}
              expanded={expanded}
              onPress={() => {
                Keyboard.dismiss();
                setExpandedTestament((current) =>
                  current === row.testament ? null : row.testament,
                );
              }}
            />
          </View>
        );
      }

      const item = row.book;
      const isExpanded = expandedBookId === item.id;

      return (
        <BookCardRow
          book={item}
          languageCode={languageCode}
          audioOnly={audioOnly}
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
      expandAllGroups,
      expandedBookId,
      expandedTestament,
      getChapters,
      isLoading,
      languageCode,
      audioOnly,
      loadChapters,
      onChapterPress,
      onDownloadStatusChange,
      t,
    ],
  );

  const isEmpty = books.length === 0;

  return (
    <FlatList
      key={isEmpty ? 'empty' : 'filled'}
      style={styles.list}
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row) => (row.type === 'group' ? `group:${row.testament}` : row.book.id)}
      extraData={`${expandedTestament}:${expandedBookId}`}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={
        <View style={styles.emptyFill}>
          <BookListEmpty
            loading={loading}
            refreshing={refreshing}
            error={error}
            onRetry={onRetry}
          />
        </View>
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
      contentContainerStyle={styles.content}
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
    flexGrow: 1,
    paddingHorizontal: BookLayout.padding,
    paddingBottom: 40,
  },
  emptyFill: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: BookLayout.listGap,
  },
  groupSpacing: {
    paddingTop: AccordionLayout.groupGap - BookLayout.listGap,
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
