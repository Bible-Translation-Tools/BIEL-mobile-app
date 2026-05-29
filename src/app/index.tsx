import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { HomeToolbar } from '@/components/home/home-toolbar';
import { LanguageList } from '@/components/home/language-list';
import { HomeLayout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguages } from '@/hooks/use-languages';
import { useTheme } from '@/hooks/use-theme';
import type { LanguageItem } from '@/types/language';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { languages, loading, error, refetch, refreshDownloadStatus } = useLanguages();

  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return languages;

    const exactMatch = languages.find((language) => language.code.toLowerCase() === query);

    const scored: { language: LanguageItem; score: number; index: number }[] = [];
    languages.forEach((language, index) => {
      if (language === exactMatch) return;

      const code = language.code.toLowerCase();
      const nationalName = language.nationalName.toLowerCase();
      const name = language.name.toLowerCase();

      let score: number | null = null;
      if (code.startsWith(query)) score = 0;
      else if (nationalName.startsWith(query)) score = 1;
      else if (name.startsWith(query)) score = 2;

      if (score !== null) scored.push({ language, score, index });
    });

    const rest = scored
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map((entry) => entry.language);

    return exactMatch ? [exactMatch, ...rest] : rest;
  }, [languages, searchQuery]);

  const handleLanguagePress = useCallback(
    (language: LanguageItem) => {
      router.push({
        pathname: '/books',
        params: { languageCode: language.code, name: language.name },
      });
    },
    [router],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <HomeHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </View>
    ),
    [searchQuery],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeToolbar />
        <LanguageList
          languages={filteredLanguages}
          loading={loading}
          error={error}
          onRetry={refetch}
          onLanguagePress={handleLanguagePress}
          onDownloadStatusChange={refreshDownloadStatus}
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
    paddingTop: HomeLayout.padding,
  },
  listHeader: {
    gap: HomeLayout.contentGap,
    paddingBottom: HomeLayout.contentGap,
  },
});
