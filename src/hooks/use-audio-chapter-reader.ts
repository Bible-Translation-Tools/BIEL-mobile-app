import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchAudioChaptersForBook } from '@/api/services/chapters';
import { useChapterAudio } from '@/hooks/use-chapter-audio';

type SeekTarget = {
  chapter: number;
  position: 'start' | 'end' | number;
};

function getAdjacentChapterNumber(
  available: number[],
  current: number,
  direction: 'next' | 'prev',
): number | null {
  const index = available.indexOf(current);
  if (index === -1) return null;
  const adjacentIndex = direction === 'next' ? index + 1 : index - 1;
  if (adjacentIndex < 0 || adjacentIndex >= available.length) return null;
  return available[adjacentIndex] ?? null;
}

export function useAudioChapterReader(
  languageCode: string | undefined,
  bookSlug: string | undefined,
  bookName: string | undefined,
  initialChapter: number | undefined,
) {
  const [chapterNumbers, setChapterNumbers] = useState<number[]>([]);
  const [activeChapter, setActiveChapter] = useState<number | undefined>(initialChapter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seekTarget, setSeekTarget] = useState<SeekTarget | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const isAdvancingRef = useRef(false);
  const prevDidJustFinishRef = useRef(false);

  const audio = useChapterAudio({
    languageCode,
    bookSlug,
    chapter: activeChapter,
    enabled: Boolean(languageCode && bookSlug && activeChapter != null),
  });

  useEffect(() => {
    if (initialChapter == null) return;
    setActiveChapter(initialChapter);
  }, [initialChapter, languageCode, bookSlug]);

  useEffect(() => {
    if (!languageCode || !bookSlug) {
      setChapterNumbers([]);
      setLoading(false);
      setError('Missing book information');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAudioChaptersForBook(languageCode, bookSlug)
      .then((chapters) => {
        if (cancelled) return;
        const numbers = chapters.map((item) => item.number).sort((a, b) => a - b);
        setChapterNumbers(numbers);
        if (numbers.length === 0) {
          setError('No audio chapters available');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setChapterNumbers([]);
        setError(err instanceof Error ? err.message : 'Failed to load chapters');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [languageCode, bookSlug]);

  useEffect(() => {
    if (!seekTarget || activeChapter == null) return;
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

    if (!shouldAutoPlay) return;

    audio.play();
    setShouldAutoPlay(false);
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
    seekTarget,
    shouldAutoPlay,
  ]);

  useEffect(() => {
    const justFinished = audio.didJustFinish && !prevDidJustFinishRef.current;
    prevDidJustFinishRef.current = audio.didJustFinish;

    if (!justFinished || activeChapter == null || isAdvancingRef.current) return;

    const chapterAtFinish = activeChapter;
    const nextChapter = getAdjacentChapterNumber(chapterNumbers, chapterAtFinish, 'next');
    if (nextChapter == null) {
      audio.pause();
      return;
    }

    isAdvancingRef.current = true;

    setActiveChapter(nextChapter);
    setSeekTarget({ chapter: nextChapter, position: 'start' });
    setShouldAutoPlay(true);
    isAdvancingRef.current = false;
  }, [
    activeChapter,
    audio.didJustFinish,
    audio.pause,
    chapterNumbers,
  ]);

  const changeChapter = useCallback(
    (chapter: number, position: 'start' | 'end' | number, resumePlayback: boolean) => {
      setActiveChapter(chapter);
      setSeekTarget({ chapter, position });
      if (resumePlayback) setShouldAutoPlay(true);
    },
    [],
  );

  const handleNextVerse = useCallback(async () => {
    if (activeChapter == null) return;
    if (audio.seekToNextVerse()) return;

    const nextChapter = getAdjacentChapterNumber(chapterNumbers, activeChapter, 'next');
    if (nextChapter == null) return;

    changeChapter(nextChapter, 'start', audio.isPlaying);
  }, [activeChapter, audio.isPlaying, audio.seekToNextVerse, changeChapter, chapterNumbers]);

  const handlePreviousVerse = useCallback(async () => {
    if (activeChapter == null) return;
    if (audio.seekToPreviousVerse()) return;

    const previousChapter = getAdjacentChapterNumber(chapterNumbers, activeChapter, 'prev');
    if (previousChapter == null) return;

    changeChapter(previousChapter, 'end', audio.isPlaying);
  }, [activeChapter, audio.isPlaying, audio.seekToPreviousVerse, changeChapter, chapterNumbers]);

  const passageLabel = (() => {
    if (activeChapter == null) return undefined;
    const name = bookName?.trim() || bookSlug || '';
    if (audio.currentVerse != null) {
      return `${name} ${activeChapter}:${audio.currentVerse}`.trim();
    }
    return `${name} ${activeChapter}`.trim();
  })();

  return {
    activeChapter,
    loading,
    error,
    passageLabel,
    audio,
    handleNextVerse,
    handlePreviousVerse,
    refetchChapters: useCallback(async () => {
      if (!languageCode || !bookSlug) return;
      setLoading(true);
      setError(null);
      try {
        const chapters = await fetchAudioChaptersForBook(languageCode, bookSlug);
        const numbers = chapters.map((item) => item.number).sort((a, b) => a - b);
        setChapterNumbers(numbers);
        if (numbers.length === 0) {
          setError('No audio chapters available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chapters');
      } finally {
        setLoading(false);
      }
    }, [bookSlug, languageCode]),
  };
}
