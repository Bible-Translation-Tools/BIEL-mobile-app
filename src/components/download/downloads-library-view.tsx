import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TestamentTabs } from '@/components/books/testament-tabs';
import { DownloadsLibraryHeader } from '@/components/download/downloads-library-header';
import { DownloadsLibraryList } from '@/components/download/downloads-library-list';
import { DownloadsLibraryToolbar } from '@/components/download/downloads-library-toolbar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDownloadsLibrary } from '@/hooks/use-downloads-library';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem, Testament } from '@/types/book';
import {
  bookMatchesContentFilter,
  getBookContentFlags,
  type LibraryContentFilter,
} from '@/types/content-type';

export function DownloadsLibraryView() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTestament, setActiveTestament] = useState<Testament>('old');
  const [contentFilter, setContentFilter] = useState<LibraryContentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { items, loading, error, refetch, refreshAfterChange } = useDownloadsLibrary();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.flatMap((item) => {
      const books = item.books.filter((book) => {
        if (book.testament !== activeTestament) return false;
        if (!bookMatchesContentFilter(book, contentFilter)) return false;
        if (!query) return true;
        return book.name.toLowerCase().includes(query);
      });

      if (books.length === 0) return [];
      return [{ ...item, books }];
    });
  }, [activeTestament, contentFilter, items, searchQuery]);

  const bookCount = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.books.length, 0),
    [filteredItems],
  );

  const handleChapterPress = useCallback(
    (languageCode: string, book: BookItem, chapter: ChapterItem) => {
      const { hasText } = getBookContentFlags(book);
      router.push({
        pathname: '/read',
        params: {
          languageCode,
          bookSlug: book.slug,
          bookName: book.name,
          chapter: String(chapter.number),
          ...(hasText ? {} : { audioOnly: '1' }),
        },
      });
    },
    [router],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View
        style={[
          styles.topChrome,
          {
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.border,
          },
        ]}>
        <SafeAreaView edges={['top', 'left', 'right']}>
          <DownloadsLibraryToolbar />
          <DownloadsLibraryHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            contentFilter={contentFilter}
            onContentFilterChange={setContentFilter}
          />
          <TestamentTabs
            activeTestament={activeTestament}
            onTestamentChange={setActiveTestament}
          />
        </SafeAreaView>
      </View>

      <View style={styles.listWrap}>
        <DownloadsLibraryList
          items={filteredItems}
          loading={loading}
          error={error}
          refreshing={refreshing}
          bookCount={bookCount}
          onRetry={refetch}
          onRefresh={handleRefresh}
          onChapterPress={handleChapterPress}
          onDownloadStatusChange={refreshAfterChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topChrome: {
    borderBottomWidth: 1,
  },
  listWrap: {
    flex: 1,
  },
});
