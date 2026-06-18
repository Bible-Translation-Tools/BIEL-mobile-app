import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioOnlyToolbar } from '@/components/reading/audio-only-toolbar';
import { MediaPlayerControls } from '@/components/reading/media-player-controls';
import { ReadingLayout } from '@/constants/theme';
import { useAudioChapterReader } from '@/hooks/use-audio-chapter-reader';
import { useSystemVolumeSync } from '@/hooks/use-system-volume-sync';
import { useTheme } from '@/hooks/use-theme';

type AudioOnlyChapterScreenProps = {
  languageCode: string;
  bookSlug: string;
  bookName?: string;
  chapter: number;
};

export function AudioOnlyChapterScreen({
  languageCode,
  bookSlug,
  bookName,
  chapter,
}: AudioOnlyChapterScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation('reading');
  const displayBookName = bookName ?? bookSlug;

  const {
    activeChapter,
    loading,
    error,
    passageLabel,
    audio,
    handleNextVerse,
    handlePreviousVerse,
    refetchChapters,
  } = useAudioChapterReader(languageCode, bookSlug, displayBookName, chapter);

  const showPlayer = !loading && !error;
  useSystemVolumeSync(showPlayer);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <AudioOnlyToolbar
        languageCode={languageCode}
        bookSlug={bookSlug}
        chapter={activeChapter ?? chapter}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.iconPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{error}</Text>
          <Pressable onPress={refetchChapters} accessibilityRole="button">
            <Text style={[styles.retry, { color: theme.text }]}>{t('tapToRetry')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <MediaPlayerControls
            passage={passageLabel}
            isPlaying={audio.isPlaying}
            isLoading={audio.isFetching}
            error={audio.error}
            canStepVerse={audio.hasVerseTimings}
            playIconSize={36}
            onTogglePlay={audio.togglePlay}
            onPreviousVerse={handlePreviousVerse}
            onNextVerse={handleNextVerse}
            volume={audio.volume}
            onVolumeChange={audio.setVolume}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: ReadingLayout.padding,
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
