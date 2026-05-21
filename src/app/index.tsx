import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { HomeToolbar } from '@/components/home/home-toolbar';
import { LanguageList } from '@/components/home/language-list';
import { HomeLayout } from '@/constants/theme';
import { LANGUAGES } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return LANGUAGES;

    return LANGUAGES.filter(
      (language) =>
        language.name.toLowerCase().includes(query) || language.code.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeToolbar />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <HomeHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <LanguageList languages={filteredLanguages} />
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HomeLayout.padding,
    paddingTop: HomeLayout.padding,
    paddingBottom: 40,
    gap: HomeLayout.contentGap,
  },
});
