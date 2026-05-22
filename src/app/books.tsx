import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookList } from '@/components/books/book-list';
import { BooksHeader } from '@/components/books/books-header';
import { BooksToolbar } from '@/components/books/books-toolbar';
import { TestamentTabs } from '@/components/books/testament-tabs';
import { BookLayout } from '@/constants/theme';
import { useBooks } from '@/hooks/use-books';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem, Testament } from '@/types/book';

export default function BookSelectionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { languageCode, name } = useLocalSearchParams<{
    languageCode: string;
    name?: string;
  }>();

  const ietfCode = languageCode;
  const languageName = name ?? 'Language';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTestament, setActiveTestament] = useState<Testament>('old');
  const { books, loading, error, refetch } = useBooks(ietfCode);

  const handleChapterPress = useCallback(
    (book: BookItem, chapter: ChapterItem) => {
      router.push({
        pathname: '/read',
        params: {
          languageCode: ietfCode,
          bookSlug: book.slug,
          bookName: book.name,
          chapter: String(chapter.number),
        },
      });
    },
    [router, ietfCode],
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
        <BooksToolbar languageName={languageName} />
        <BookList
          books={filteredBooks}
          languageCode={ietfCode}
          loading={loading}
          error={error}
          onRetry={refetch}
          onChapterPress={handleChapterPress}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
        />
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
});
