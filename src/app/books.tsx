import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookList } from '@/components/books/book-list';
import { BooksHeader } from '@/components/books/books-header';
import { BooksToolbar } from '@/components/books/books-toolbar';
import { TestamentTabs } from '@/components/books/testament-tabs';
import { BookLayout } from '@/constants/theme';
import { useBooks } from '@/hooks/use-books';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { stopPlayback } from '@/services/track-player/chapter-playback';
import type { BookItem, ChapterItem, Testament } from '@/types/book';
import { normalizeRouteParam } from '@/utils/route-params';

export default function BookSelectionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { languageCode, hasText: hasTextParam } = useLocalSearchParams<{
    languageCode: string | string[];
    name?: string | string[];
    hasText?: string | string[];
  }>();

  const { t } = useTranslation('books');
  const ietfCode = normalizeRouteParam(languageCode);
  const hasText =
    normalizeRouteParam(hasTextParam) !== '0' && normalizeRouteParam(hasTextParam) !== 'false';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTestament, setActiveTestament] = useState<Testament>('old');
  const [refreshing, setRefreshing] = useState(false);
  const [listKey, setListKey] = useState(0);
  const { books, loading, error, refetch, refreshDownloadStatus } = useBooks(ietfCode);

  useFocusEffect(
    useCallback(() => {
      void stopPlayback();
    }, []),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setListKey((current) => current + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleChapterPress = useCallback(
    (book: BookItem, chapter: ChapterItem) => {
      router.push({
        pathname: '/read',
        params: {
          languageCode: ietfCode,
          bookSlug: book.slug,
          bookName: book.name,
          chapter: String(chapter.number),
          ...(hasText ? {} : { audioOnly: '1' }),
        },
      });
    },
    [hasText, router, ietfCode],
  );

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return books.filter((book) => {
      if (book.testament !== activeTestament) return false;
      if (!query) return true;
      return book.name.toLowerCase().includes(query);
    });
  }, [books, searchQuery, activeTestament]);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <BooksHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <TestamentTabs
          activeTestament={activeTestament}
          onTestamentChange={setActiveTestament}
        />
      </View>
    ),
    [searchQuery, activeTestament],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <BooksToolbar />
        {ietfCode ? (
          <BookList
            key={listKey}
            books={filteredBooks}
            languageCode={ietfCode}
            audioOnly={!hasText}
            loading={loading}
            error={error}
            onRetry={refetch}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onChapterPress={handleChapterPress}
            onDownloadStatusChange={refreshDownloadStatus}
            ListHeaderComponent={listHeader}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.missingLanguage}>
            <Text style={[styles.missingLanguageText, { color: theme.textSecondary }]}>
              {error ?? t('languageNotFound')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingTop: BookLayout.padding,
  },
  listHeader: {
    gap: BookLayout.contentGap,
    paddingBottom: BookLayout.contentGap,
  },
  missingLanguage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BookLayout.padding,
  },
  missingLanguageText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
