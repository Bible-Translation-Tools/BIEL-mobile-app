import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPlayerPanel } from '@/components/reading/media-player-panel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout } from '@/constants/theme';
import { useChapterAudio } from '@/hooks/use-chapter-audio';
import { useSystemVolumeSync } from '@/hooks/use-system-volume-sync';
import { useTheme } from '@/hooks/use-theme';
import { formatAudioPassageLabel } from '@/utils/format-audio-passage-label';

type SeekTarget = {
  chapter: number;
  position: 'start' | 'end' | number;
};

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
  onPanelOpenChange?: (open: boolean) => void;
  playVerseAtRef?: MutableRefObject<((chapter: number, verse: number) => void) | undefined>;
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
  onPanelOpenChange,
  playVerseAtRef,
}: AudioPlayButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation('reading');
  const insets = useSafeAreaInsets();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number | undefined>(undefined);
  const [shouldAutoPlayOnOpen, setShouldAutoPlayOnOpen] = useState(false);
  const [shouldAutoPlayNextChapter, setShouldAutoPlayNextChapter] = useState(false);
  const [seekTarget, setSeekTarget] = useState<SeekTarget | null>(null);
  const isAdvancingRef = useRef(false);
  const prevDidJustFinishRef = useRef(false);

  const audio = useChapterAudio({
    languageCode,
    bookSlug,
    bookName: passageBookName,
    chapter: activeChapter,
    enabled: isPanelOpen,
  });

  useSystemVolumeSync(isPanelOpen);

  useEffect(() => {
    if (!isPanelOpen || audio.loadedChapter == null) return;
    if (audio.loadedChapter === activeChapter) return;
    // A pending seek means the user picked a verse in another chapter — wait for that load.
    if (seekTarget != null) return;
    setActiveChapter(audio.loadedChapter);
    onCurrentChapterChange?.(audio.loadedChapter);
  }, [activeChapter, audio.loadedChapter, isPanelOpen, onCurrentChapterChange, seekTarget]);

  useEffect(() => {
    if (!isPanelOpen) {
      onCurrentVerseChange?.(null);
      return;
    }

    if (seekTarget != null && seekTarget.chapter === activeChapter) {
      if (seekTarget.position === 'start') {
        onCurrentVerseChange?.(1);
        return;
      }
      if (typeof seekTarget.position === 'number') {
        onCurrentVerseChange?.(seekTarget.position);
        return;
      }
    }

    onCurrentVerseChange?.(audio.currentVerse);
  }, [activeChapter, audio.currentVerse, isPanelOpen, onCurrentVerseChange, seekTarget]);

  useEffect(() => {
    if (!isPanelOpen || !shouldAutoPlayOnOpen || !activeChapter) return;
    if (audio.isFetching || !audio.audioUrl || audio.error) return;
    if (audio.loadedChapter !== activeChapter) return;

    audio.play();
    setShouldAutoPlayOnOpen(false);
  }, [
    activeChapter,
    audio.audioUrl,
    audio.error,
    audio.isFetching,
    audio.loadedChapter,
    audio.play,
    isPanelOpen,
    shouldAutoPlayOnOpen,
  ]);

  useEffect(() => {
    if (!isPanelOpen || !seekTarget || !activeChapter) return;
    if (seekTarget.chapter !== activeChapter) return;
    if (audio.loadedChapter !== activeChapter || audio.isFetching || !audio.audioUrl) return;

    const { position } = seekTarget;
    let seekDone = false;

    if (typeof position === 'number') {
      if (!audio.hasVerseTimings) return;
      seekDone = audio.seekToVerse(position);
    } else if (position === 'start') {
      audio.seekToFirstVerse();
      seekDone = true;
    } else if (position === 'end') {
      if (!audio.hasVerseTimings && (audio.duration ?? 0) <= 0) return;
      audio.seekToLastVerse();
      seekDone = true;
    }

    if (!seekDone) return;

    setSeekTarget(null);

    if (!shouldAutoPlayNextChapter) return;

    audio.play();
    setShouldAutoPlayNextChapter(false);
  }, [
    activeChapter,
    audio.audioUrl,
    audio.duration,
    audio.hasVerseTimings,
    audio.isFetching,
    audio.loadedChapter,
    audio.play,
    audio.seekToFirstVerse,
    audio.seekToLastVerse,
    audio.seekToVerse,
    isPanelOpen,
    seekTarget,
    shouldAutoPlayNextChapter,
  ]);

  useEffect(() => {
    const justFinished = audio.didJustFinish && !prevDidJustFinishRef.current;
    prevDidJustFinishRef.current = audio.didJustFinish;

    if (!isPanelOpen || !justFinished) return;
    if (!activeChapter || !getNextChapter || isAdvancingRef.current) return;

    if (audio.loadedChapter != null && audio.loadedChapter !== activeChapter) {
      const loadedChapter = audio.loadedChapter;
      const chapterAtFinish = activeChapter;
      isAdvancingRef.current = true;

      void (async () => {
        try {
          if (getNextChapter) {
            await getNextChapter(chapterAtFinish);
          }
          setActiveChapter(loadedChapter);
          onCurrentChapterChange?.(loadedChapter);
          setSeekTarget({ chapter: loadedChapter, position: 'start' });
        } finally {
          isAdvancingRef.current = false;
        }
      })();
      return;
    }

    isAdvancingRef.current = true;
    const chapterAtFinish = activeChapter;

    (async () => {
      try {
        const nextChapter = await getNextChapter(chapterAtFinish);
        if (nextChapter == null) {
          audio.pause();
          onCurrentChapterChange?.(chapterAtFinish);
          return;
        }
        setActiveChapter(nextChapter);
        onCurrentChapterChange?.(nextChapter);
        setSeekTarget({ chapter: nextChapter, position: 'start' });
        setShouldAutoPlayNextChapter(true);
      } finally {
        isAdvancingRef.current = false;
      }
    })();
  }, [
    activeChapter,
    audio.didJustFinish,
    audio.pause,
    audio.play,
    getNextChapter,
    isPanelOpen,
    onCurrentChapterChange,
  ]);

  const changeChapter = useCallback(
    (chapter: number, position: 'start' | 'end' | number, resumePlayback: boolean) => {
      setActiveChapter(chapter);
      onCurrentChapterChange?.(chapter);
      setSeekTarget({ chapter, position });
      if (resumePlayback) setShouldAutoPlayNextChapter(true);
    },
    [onCurrentChapterChange],
  );

  const playVerseAt = useCallback(
    (chapter: number, verse: number) => {
      if (!isPanelOpen) return;

      if (chapter === activeChapter) {
        if (!audio.seekToVerse(verse)) return;
        if (!audio.isPlaying) audio.togglePlay();
        return;
      }

      changeChapter(chapter, verse, audio.isPlaying);
    },
    [activeChapter, audio.isPlaying, audio.seekToVerse, audio.togglePlay, changeChapter, isPanelOpen],
  );

  useEffect(() => {
    if (!playVerseAtRef) return;
    playVerseAtRef.current = playVerseAt;
    return () => {
      playVerseAtRef.current = undefined;
    };
  }, [playVerseAt, playVerseAtRef]);

  useEffect(() => {
    onPanelOpenChange?.(isPanelOpen);
  }, [isPanelOpen, onPanelOpenChange]);

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
    onPanelOpenChange?.(false);
    onCurrentVerseChange?.(null);
    onCurrentChapterChange?.(null);
    onPanelHeightChange?.(0);
    setIsPanelOpen(false);
    setShouldAutoPlayOnOpen(false);
    setShouldAutoPlayNextChapter(false);
    setSeekTarget(null);
  };

  if (isPanelOpen) {
    return (
      <MediaPlayerPanel
        passage={formatAudioPassageLabel(passageBookName, activeChapter, audio.currentVerse)}
        isPlaying={audio.isPlaying}
        isLoading={audio.isFetching}
        error={audio.error}
        canStepVerse={audio.hasVerseTimings}
        onClose={closePanel}
        onTogglePlay={audio.togglePlay}
        onPreviousVerse={handlePreviousVerse}
        onNextVerse={handleNextVerse}
        volume={audio.volume}
        onVolumeChange={audio.setVolume}
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
          setShouldAutoPlayOnOpen(true);
          setIsPanelOpen(true);
          onCurrentChapterChange?.(chapterToPlay ?? null);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('openAudioPlayer')}>
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
