import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { HomeToolbar } from '@/components/home/home-toolbar';
import { LanguageList } from '@/components/home/language-list';
import { HomeLayout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguages } from '@/hooks/use-languages';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { languages, loading, error, refetch } = useLanguages();

  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return languages;

    return languages.filter(
      (language) =>
        language.name.toLowerCase().includes(query) ||
        language.code.toLowerCase().includes(query),
    );
  }, [languages, searchQuery]);

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
