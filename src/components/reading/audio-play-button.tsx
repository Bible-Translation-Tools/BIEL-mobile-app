import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaPlayerPanel } from '@/components/reading/media-player-panel';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MediaPlayerLayout, Typography } from '@/constants/theme';
import { useChapterAudio } from '@/hooks/use-chapter-audio';
import { useSystemVolumeSync } from '@/hooks/use-system-volume-sync';
import { useTheme } from '@/hooks/use-theme';
import {
  getChapterPlaybackSnapshot,
  requestChapterLoad,
} from '@/services/track-player/chapter-playback';
import { formatAudioPassageLabel } from '@/utils/format-audio-passage-label';

type SeekTarget = {
  chapter: number;
  position: 'start' | 'end' | number;
};

function resolveInitialActiveChapter(
  initialPanelOpen: boolean,
  getCurrentChapter?: () => number | undefined,
): number | undefined {
  if (!initialPanelOpen) return undefined;

  const { loadedChapter } = getChapterPlaybackSnapshot();
  return loadedChapter ?? getCurrentChapter?.();
}

type AudioPlayButtonProps = {
  languageCode?: string;
  bookSlug?: string;
  passageBookName?: string;
  initialPanelOpen?: boolean;
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
  initialPanelOpen = false,
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
  const [isPanelOpen, setIsPanelOpen] = useState(initialPanelOpen);
  const [activeChapter, setActiveChapter] = useState<number | undefined>(() =>
    resolveInitialActiveChapter(initialPanelOpen, getCurrentChapter),
  );
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
    if (!initialPanelOpen) return;

    const chapterToPlay = resolveInitialActiveChapter(true, getCurrentChapter);
    setActiveChapter(chapterToPlay);
    onCurrentChapterChange?.(chapterToPlay ?? null);
    onPanelOpenChange?.(true);
  }, [getCurrentChapter, initialPanelOpen, onCurrentChapterChange, onPanelOpenChange]);

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
        requestChapterLoad(nextChapter);
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
      requestChapterLoad(chapter);
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

  const openPanel = () => {
    const chapterToPlay = getCurrentChapter?.();
    if (chapterToPlay != null) requestChapterLoad(chapterToPlay);
    setActiveChapter(chapterToPlay);
    setShouldAutoPlayOnOpen(true);
    setIsPanelOpen(true);
    onCurrentChapterChange?.(chapterToPlay ?? null);
  };

  const collapsedPassage = formatAudioPassageLabel(
    passageBookName,
    getCurrentChapter?.(),
    undefined,
  );

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
      style={[
        styles.collapsedPanel,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          paddingBottom: MediaPlayerLayout.paddingV + insets.bottom,
        },
      ]}
      onLayout={(event) => onPanelHeightChange?.(event.nativeEvent.layout.height)}
      accessibilityRole="toolbar"
      accessibilityLabel={t('audioPlayer')}>
      <Text
        style={[styles.collapsedPassage, { color: theme.textHeading }]}
        numberOfLines={1}>
        {collapsedPassage}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.collapsedPlayButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={openPanel}
        accessibilityRole="button"
        accessibilityLabel={t('play')}>
        <IconSymbol
          name={{ ios: 'play.fill', android: 'play-arrow' }}
          size={MediaPlayerLayout.collapsedPlayIconSize}
          color={theme.iconPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopLeftRadius: MediaPlayerLayout.topRadius,
    borderTopRightRadius: MediaPlayerLayout.topRadius,
    paddingHorizontal: MediaPlayerLayout.paddingH,
    paddingTop: MediaPlayerLayout.paddingV,
  },
  collapsedPassage: {
    ...Typography.headingH6,
    fontWeight: '500',
    lineHeight: 32,
    flex: 1,
    minWidth: 0,
  },
  collapsedPlayButton: {
    width: MediaPlayerLayout.collapsedPlayIconSize,
    height: MediaPlayerLayout.collapsedPlayIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
