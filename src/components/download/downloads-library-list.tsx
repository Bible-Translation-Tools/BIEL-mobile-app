import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { DownloadsLibraryBookRow } from '@/components/download/downloads-library-book-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DownloadsLibraryLayout, HomeLayout } from '@/constants/theme';
import type { DownloadedLibraryLanguage } from '@/api/services/books';
import type { BookDownloadStatusChange } from '@/hooks/use-books';
import { useLibraryChapters } from '@/hooks/use-library-chapters';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem } from '@/types/book';

type DownloadsLibraryListProps = {
  items: DownloadedLibraryLanguage[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  bookCount: number;
  onRetry: () => void;
  onRefresh: () => void | Promise<void>;
  onChapterPress: (languageCode: string, book: BookItem, chapter: ChapterItem) => void;
  onDownloadStatusChange: () => void;
};

type ExpandedBook = {
  languageCode: string;
  bookId: string;
};

function DownloadsLibraryEmpty({
  loading,
  refreshing,
  error,
  onRetry,
}: {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('library');
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
        <Text style={[styles.retry, { color: theme.text }]} onPress={onRetry}>
          {tc('retry')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{t('noDownloads')}</Text>
    </View>
  );
}

function LanguageAccordion({
  item,
  expanded,
  expandedBook,
  getChapters,
  isChaptersLoading,
  onToggleLanguage,
  onToggleBook,
  onChapterPress,
  onDownloadStatusChange,
}: {
  item: DownloadedLibraryLanguage;
  expanded: boolean;
  expandedBook: ExpandedBook | null;
  getChapters: (languageCode: string, bookSlug: string) => ChapterItem[] | undefined;
  isChaptersLoading: (languageCode: string, bookSlug: string) => boolean;
  onToggleLanguage: () => void;
  onToggleBook: (book: BookItem) => void;
  onChapterPress: (languageCode: string, book: BookItem, chapter: ChapterItem) => void;
  onDownloadStatusChange: (change?: BookDownloadStatusChange) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('books');
  const languageName = item.language.nationalName || item.language.name;

  return (
    <View style={styles.accordion}>
      <Pressable
        style={({ pressed }) => [styles.languageHeader, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onToggleLanguage}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? t('accessibility.collapse', { name: languageName })
            : t('accessibility.expand', { name: languageName })
        }
        accessibilityState={{ expanded }}>
        <Text style={[styles.languageTitle, { color: theme.text }]}>{languageName}</Text>
        <IconSymbol
          name={
            expanded
              ? { ios: 'chevron.up', android: 'keyboard_arrow_up' }
              : { ios: 'chevron.down', android: 'keyboard_arrow_down' }
          }
          size={28}
          color={theme.iconTertiary}
        />
      </Pressable>

      {expanded
        ? item.books.map((book) => {
            const isBookExpanded =
              expandedBook?.languageCode === item.language.code &&
              expandedBook.bookId === book.id;

            return (
              <DownloadsLibraryBookRow
                key={`${item.language.code}:${book.id}`}
                book={book}
                languageCode={item.language.code}
                isExpanded={isBookExpanded}
                chapters={getChapters(item.language.code, book.slug)}
                chaptersLoading={isChaptersLoading(item.language.code, book.slug)}
                onToggleExpand={() => onToggleBook(book)}
                onChapterPress={(chapter) => onChapterPress(item.language.code, book, chapter)}
                onDownloadStatusChange={onDownloadStatusChange}
              />
            );
          })
        : null}
    </View>
  );
}

export function DownloadsLibraryList({
  items,
  loading,
  error,
  refreshing,
  bookCount,
  onRetry,
  onRefresh,
  onChapterPress,
  onDownloadStatusChange,
}: DownloadsLibraryListProps) {
  const theme = useTheme();
  const { t } = useTranslation('library');
  const [expandedLanguageCode, setExpandedLanguageCode] = useState<string | null>(null);
  const [expandedBook, setExpandedBook] = useState<ExpandedBook | null>(null);
  const { loadChapters, getChapters, isLoading, clearCache } = useLibraryChapters();

  useEffect(() => {
    if (items.length === 0) {
      setExpandedLanguageCode(null);
      setExpandedBook(null);
      return;
    }

    setExpandedLanguageCode((current) => {
      if (current && items.some((item) => item.language.code === current)) {
        return current;
      }
      return items[0]?.language.code ?? null;
    });
  }, [items]);

  useEffect(() => {
    if (!expandedBook) return;
    const language = items.find((item) => item.language.code === expandedBook.languageCode);
    if (!language?.books.some((book) => book.id === expandedBook.bookId)) {
      setExpandedBook(null);
    }
  }, [expandedBook, items]);

  const handleRefresh = useCallback(async () => {
    clearCache();
    await onRefresh();
  }, [clearCache, onRefresh]);

  const handleToggleBook = useCallback(
    (languageCode: string, book: BookItem) => {
      Keyboard.dismiss();
      const willExpand =
        expandedBook?.languageCode !== languageCode || expandedBook.bookId !== book.id;
      if (willExpand) {
        void loadChapters(languageCode, book.slug);
      }
      setExpandedBook((current) =>
        current?.languageCode === languageCode && current.bookId === book.id
          ? null
          : { languageCode, bookId: book.id },
      );
    },
    [expandedBook, loadChapters],
  );

  const renderItem: ListRenderItem<DownloadedLibraryLanguage> = useCallback(
    ({ item }) => (
      <LanguageAccordion
        item={item}
        expanded={expandedLanguageCode === item.language.code}
        expandedBook={expandedBook}
        getChapters={getChapters}
        isChaptersLoading={isLoading}
        onToggleLanguage={() => {
          Keyboard.dismiss();
          setExpandedLanguageCode((current) =>
            current === item.language.code ? null : item.language.code,
          );
        }}
        onToggleBook={(book) => handleToggleBook(item.language.code, book)}
        onChapterPress={onChapterPress}
        onDownloadStatusChange={() => onDownloadStatusChange()}
      />
    ),
    [
      expandedBook,
      expandedLanguageCode,
      getChapters,
      handleToggleBook,
      isLoading,
      onChapterPress,
      onDownloadStatusChange,
    ],
  );

  const isEmpty = items.length === 0;

  return (
    <FlatList
      style={styles.list}
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.language.code}
      extraData={`${expandedLanguageCode}:${expandedBook?.languageCode}:${expandedBook?.bookId}`}
      ListHeaderComponent={
        isEmpty ? null : (
          <Text style={[styles.count, { color: theme.textLabel }]}>
            {t('booksDownloaded', { count: bookCount })}
          </Text>
        )
      }
      ListEmptyComponent={
        <DownloadsLibraryEmpty
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRetry={onRetry}
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.iconPrimary}
          colors={[theme.tabActive]}
        />
      }
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={[styles.content, isEmpty && styles.contentEmpty]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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
    paddingHorizontal: HomeLayout.padding,
    paddingTop: HomeLayout.padding,
    paddingBottom: 40,
  },
  contentEmpty: {
    flex: 1,
  },
  count: {
    fontSize: 14,
    marginBottom: DownloadsLibraryLayout.countGap,
  },
  accordion: {
    gap: HomeLayout.listGap,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: HomeLayout.rowGap,
  },
  languageTitle: {
    fontSize: DownloadsLibraryLayout.languageTitleSize,
    lineHeight: DownloadsLibraryLayout.languageTitleLineHeight,
    fontWeight: '700',
    flex: 1,
  },
  separator: {
    height: DownloadsLibraryLayout.accordionGap,
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
