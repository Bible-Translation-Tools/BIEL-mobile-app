import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPlayerPanel } from '@/components/reading/media-player-panel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout } from '@/constants/theme';
import { useChapterAudio } from '@/hooks/use-chapter-audio';
import { useTheme } from '@/hooks/use-theme';

type AudioPlayButtonProps = {
  languageCode?: string;
  bookSlug?: string;
  passageBookName?: string;
  getCurrentChapter?: () => number | undefined;
  getNextChapter?: (currentChapter: number) => Promise<number | undefined> | number | undefined;
  getPreviousChapter?: (currentChapter: number) => Promise<number | undefined> | number | undefined;
  onCurrentVerseChange?: (verse: number | null) => void;
  onCurrentChapterChange?: (chapter: number | null) => void;
  onPanelHeightChange?: (height: number) => void;
};

export function AudioPlayButton({
  languageCode,
  bookSlug,
  passageBookName,
  getCurrentChapter,
  getNextChapter,
  getPreviousChapter,
  onCurrentVerseChange,
  onCurrentChapterChange,
  onPanelHeightChange,
}: AudioPlayButtonProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number | undefined>(undefined);
  const [shouldAutoPlayNextChapter, setShouldAutoPlayNextChapter] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<'start' | 'end' | null>(null);
  const isAdvancingRef = useRef(false);

  const audio = useChapterAudio({
    languageCode,
    bookSlug,
    chapter: activeChapter,
    enabled: isPanelOpen,
  });

  useEffect(() => {
    onCurrentVerseChange?.(isPanelOpen ? audio.currentVerse : null);
  }, [audio.currentVerse, isPanelOpen, onCurrentVerseChange]);

  useEffect(() => {
    if (!isPanelOpen) return;
    if (audio.isFetching || !audio.audioUrl) return;

    if (pendingSeek === 'start') {
      audio.seekToFirstVerse();
      setPendingSeek(null);
    } else if (pendingSeek === 'end') {
      if (!audio.hasVerseTimings && (audio.duration ?? 0) <= 0) return;
      audio.seekToLastVerse();
      setPendingSeek(null);
    }

    if (!shouldAutoPlayNextChapter) return;
    if (audio.isPlaying) {
      setShouldAutoPlayNextChapter(false);
      return;
    }

    audio.togglePlay();
    setShouldAutoPlayNextChapter(false);
  }, [
    audio.audioUrl,
    audio.duration,
    audio.hasVerseTimings,
    audio.isFetching,
    audio.isPlaying,
    audio.seekToFirstVerse,
    audio.seekToLastVerse,
    audio.togglePlay,
    isPanelOpen,
    pendingSeek,
    shouldAutoPlayNextChapter,
  ]);

  useEffect(() => {
    if (!isPanelOpen || !audio.didJustFinish) return;
    if (!activeChapter || !getNextChapter || isAdvancingRef.current) return;

    isAdvancingRef.current = true;
    const chapterAtFinish = activeChapter;

    (async () => {
      try {
        const nextChapter = await getNextChapter(chapterAtFinish);
        if (nextChapter == null) {
          onCurrentChapterChange?.(chapterAtFinish);
          return;
        }
        setActiveChapter(nextChapter);
        onCurrentChapterChange?.(nextChapter);
        setShouldAutoPlayNextChapter(true);
      } finally {
        isAdvancingRef.current = false;
      }
    })();
  }, [activeChapter, audio.didJustFinish, getNextChapter, isPanelOpen, onCurrentChapterChange]);

  const changeChapter = useCallback(
    (chapter: number, seek: 'start' | 'end', resumePlayback: boolean) => {
      setActiveChapter(chapter);
      onCurrentChapterChange?.(chapter);
      setPendingSeek(seek);
      if (resumePlayback) setShouldAutoPlayNextChapter(true);
    },
    [onCurrentChapterChange],
  );

  const handleNextVerse = useCallback(async () => {
    if (audio.seekToNextVerse()) return;
    if (!activeChapter || !getNextChapter) return;

    const nextChapter = await getNextChapter(activeChapter);
    if (nextChapter == null) return;

    changeChapter(nextChapter, 'start', audio.isPlaying);
  }, [
    activeChapter,
    audio.isPlaying,
    audio.seekToNextVerse,
    changeChapter,
    getNextChapter,
  ]);

  const handlePreviousVerse = useCallback(async () => {
    if (audio.seekToPreviousVerse()) return;
    if (!activeChapter || !getPreviousChapter) return;

    const previousChapter = await getPreviousChapter(activeChapter);
    if (previousChapter == null) return;

    changeChapter(previousChapter, 'end', audio.isPlaying);
  }, [
    activeChapter,
    audio.isPlaying,
    audio.seekToPreviousVerse,
    changeChapter,
    getPreviousChapter,
  ]);

  const closePanel = () => {
    audio.pause();
    setIsPanelOpen(false);
    setShouldAutoPlayNextChapter(false);
    setPendingSeek(null);
    onCurrentChapterChange?.(null);
    onPanelHeightChange?.(0);
  };

  if (isPanelOpen) {
    return (
      <MediaPlayerPanel
        passage={activeChapter != null ? `${passageBookName ?? ''} ${activeChapter}`.trim() : undefined}
        isPlaying={audio.isPlaying}
        isLoading={audio.isFetching}
        error={audio.error}
        canStepVerse={audio.hasVerseTimings}
        onClose={closePanel}
        onTogglePlay={audio.togglePlay}
        onPreviousVerse={handlePreviousVerse}
        onNextVerse={handleNextVerse}
        onHeightChange={onPanelHeightChange}
      />
    );
  }

  return (
    <View
      style={[styles.wrapper, { bottom: ReadingLayout.playButtonBottom + insets.bottom }]}
      pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.backgroundElement,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        onPress={() => {
          const chapterToPlay = getCurrentChapter?.();
          setActiveChapter(chapterToPlay);
          setIsPanelOpen(true);
          onCurrentChapterChange?.(chapterToPlay ?? null);
        }}
        accessibilityRole="button"
        accessibilityLabel="Open audio player">
        <IconSymbol
          name={{ ios: 'speaker.wave.2.fill', android: 'volume-up', web: 'volume-up' }}
          size={28}
          color={theme.iconPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: ReadingLayout.playButtonSize,
    height: ReadingLayout.playButtonSize,
    borderRadius: ReadingLayout.playButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 0.5,
    elevation: 2,
  },
});
