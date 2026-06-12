import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '@/app/read.styles';
import { AudioOnlyChapterScreen } from '@/components/reading/audio-only-chapter-screen';
import { AudioPlayButton } from '@/components/reading/audio-play-button';
import { ReadingScreenList } from '@/components/reading/reading-screen-list';
import { ReadingToolbar } from '@/components/reading/reading-toolbar';
import { useChapterHasAudio } from '@/hooks/use-chapter-audio';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReaderAudioSync } from '@/hooks/use-reader-audio-sync';
import { useReaderScroll } from '@/hooks/use-reader-scroll';
import { useReaderToolbar } from '@/hooks/use-reader-toolbar';
import { useStopPlaybackOnLeave } from '@/hooks/use-stop-playback-on-leave';
import { useTheme } from '@/hooks/use-theme';
import { getResumedPlaybackChapter } from '@/services/track-player/chapter-playback';
import { normalizeRouteParam } from '@/utils/route-params';

export default function ReadingScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { languageCode, bookSlug, bookName, chapter, audioOnly: audioOnlyParam, openAudio: openAudioParam } =
    useLocalSearchParams<{
      languageCode: string;
      bookSlug: string;
      bookName?: string;
      chapter: string;
      audioOnly?: string;
      openAudio?: string;
    }>();

  const ietfCode = normalizeRouteParam(languageCode) ?? '';
  const resolvedBookSlug = normalizeRouteParam(bookSlug) ?? '';
  const resolvedBookName = normalizeRouteParam(bookName);
  const audioOnly = audioOnlyParam === '1' || audioOnlyParam === 'true';
  const openAudio = openAudioParam === '1' || openAudioParam === 'true';
  const chapterNumber = Number.parseInt(normalizeRouteParam(chapter) ?? '', 10);
  const resumedPlaybackChapter = openAudio ? getResumedPlaybackChapter() : null;
  const effectiveChapterNumber =
    resumedPlaybackChapter ?? (Number.isFinite(chapterNumber) ? chapterNumber : undefined);

  useStopPlaybackOnLeave();

  const {
    chapters,
    loading,
    loadingMore,
    error,
    hasMore,
    hasPrevious,
    loadMore,
    loadPrevious,
    handleScroll,
    checkFillViewport,
    initialScrollIndex,
    clearInitialScrollIndex,
    refetch,
    audioOnlyFallback,
  } = useReaderScroll(
    audioOnly ? undefined : languageCode,
    audioOnly ? undefined : bookSlug,
    audioOnly || effectiveChapterNumber == null ? undefined : effectiveChapterNumber,
  );

  const displayBookName =
    chapters.find((item) => item.chapter === chapterNumber)?.bookName ??
    chapters[0]?.bookName ??
    bookName ??
    bookSlug;

  const { toolbarChapterTitle, visibleChapter, updateScrollY, onViewableItemsChanged, viewabilityConfig } =
    useReaderToolbar(displayBookName);

  const currentAudioChapter = visibleChapter ?? effectiveChapterNumber;
  const currentChapterHasAudio = useChapterHasAudio({
    languageCode,
    bookSlug,
    chapter: currentAudioChapter,
  });

  const audioSync = useReaderAudioSync({
    chapters,
    hasMore,
    hasPrevious,
    loadMore,
    loadPrevious,
    openAudio,
    resumedPlaybackChapter,
    visibleChapter,
    effectiveChapterNumber,
    languageCode,
    bookSlug,
    chapterNumber,
    loading,
    initialScrollIndex,
    clearInitialScrollIndex,
    updateScrollY,
    handleScroll,
    checkFillViewport,
    displayBookName,
  });

  if (
    (audioOnly || audioOnlyFallback) &&
    ietfCode &&
    resolvedBookSlug &&
    effectiveChapterNumber != null
  ) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AudioOnlyChapterScreen
          languageCode={ietfCode}
          bookSlug={resolvedBookSlug}
          bookName={resolvedBookName}
          chapter={effectiveChapterNumber}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ReadingToolbar
          chapterTitle={toolbarChapterTitle}
          downloadContext={
            ietfCode && resolvedBookSlug && Number.isFinite(chapterNumber)
              ? {
                  languageCode: ietfCode,
                  bookSlug: resolvedBookSlug,
                  chapter: visibleChapter ?? chapterNumber,
                }
              : undefined
          }
        />

        <ReadingScreenList
          listRef={audioSync.listRef}
          chapters={chapters}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          listExtraData={audioSync.listExtraData}
          renderItem={audioSync.renderItem}
          keyExtractor={audioSync.keyExtractor}
          onScroll={audioSync.onScroll}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={audioSync.onScrollToIndexFailed}
          onListLayout={audioSync.onListLayout}
          onListContentSizeChange={audioSync.onListContentSizeChange}
          loadMore={loadMore}
          refetch={refetch}
          iconPrimary={theme.iconPrimary}
          textSecondary={theme.textSecondary}
          text={theme.text}
        />

        {chapters.length > 0 && currentChapterHasAudio ? (
          <AudioPlayButton
            languageCode={languageCode}
            bookSlug={bookSlug}
            passageBookName={displayBookName}
            initialPanelOpen={openAudio}
            getCurrentChapter={audioSync.getCurrentChapterForAudio}
            getNextChapter={audioSync.getNextChapterForAudio}
            getPreviousChapter={audioSync.getPreviousChapterForAudio}
            onCurrentVerseChange={audioSync.setCurrentPlayingVerse}
            onCurrentChapterChange={audioSync.setCurrentPlayingChapter}
            onPanelHeightChange={audioSync.onPanelHeightChange}
            onPanelOpenChange={audioSync.onPanelOpenChange}
            playVerseAtRef={audioSync.playVerseAtRef}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}
