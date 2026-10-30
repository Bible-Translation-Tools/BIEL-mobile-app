import type { NavigationProp, ParamListBase, StackNavigationState } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { HomeToolbar } from '@/components/home/home-toolbar';
import { LanguageList } from '@/components/home/language-list';
import { HomeLayout } from '@/constants/theme';
import { getRestoreHrefs } from '@/domain/reading-checkpoint';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguages } from '@/hooks/use-languages';
import { useTheme } from '@/hooks/use-theme';
import { getReadingCheckpointSnapshot } from '@/stores/reading-checkpoint-store';
import type { LanguageItem } from '@/types/language';
import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

// The native stack emits `transitionEnd` on a screen once it has finished appearing or disappearing.
type StackNavigation = NavigationProp<
  ParamListBase,
  string,
  undefined,
  StackNavigationState<ParamListBase>,
  object,
  { transitionEnd: { data: { closing: boolean } } }
>;

// Only the first mount after launch may restore; the store's snapshot changes while a reader is open.
let launchRestoreHandled = false;

function takeLaunchCheckpoint(): ReadingCheckpoint | null {
  if (launchRestoreHandled) return null;
  launchRestoreHandled = true;
  return getReadingCheckpointSnapshot();
}

export default function IndexRoute() {
  const router = useRouter();
  const navigation = useNavigation<StackNavigation>();
  const theme = useTheme();
  const [checkpoint] = useState(takeLaunchCheckpoint);
  const restoredRef = useRef(false);
  // Blank instead of Home while the restored screen opens, so Home doesn't flash first.
  const [showHome, setShowHome] = useState(checkpoint == null);

  // Reopen the book list or chapter the user was on, with the screens behind it, so Back walks up
  // the stack. A reader's parent is pushed without an animation (`restored` param), so one slides in.
  useEffect(() => {
    if (checkpoint == null || restoredRef.current) return;
    restoredRef.current = true;
    for (const href of getRestoreHrefs(checkpoint)) router.push(href);
  }, [checkpoint, router]);

  // Render Home underneath only once the restored screen has fully covered this one (losing focus
  // happens as the slide starts, which would show Home under it), so it is ready when Back returns.
  useEffect(() => {
    if (showHome) return;
    return navigation.addListener('transitionEnd', (event) => {
      if (event.data.closing) setShowHome(true);
    });
  }, [navigation, showHome]);

  if (!showHome) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  return <HomeScreen />;
}

function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [listKey, setListKey] = useState(0);
  const { languages, loading, error, refetch, refreshDownloadStatus } = useLanguages();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setListKey((current) => current + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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
        params: {
          languageCode: language.code,
          name: language.name,
          hasText: language.hasText ? '1' : '0',
          hasAudio: language.hasAudio ? '1' : '0',
        },
      });
    },
    [router],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <HomeToolbar />
        <View style={styles.stickyHeader}>
          <HomeHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </View>
        <LanguageList
          key={listKey}
          languages={filteredLanguages}
          loading={loading}
          error={error}
          onRetry={refetch}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onLanguagePress={handleLanguagePress}
          onDownloadStatusChange={refreshDownloadStatus}
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
  stickyHeader: {
    paddingHorizontal: HomeLayout.padding,
    paddingTop: HomeLayout.padding,
    paddingBottom: HomeLayout.contentGap,
  },
});
