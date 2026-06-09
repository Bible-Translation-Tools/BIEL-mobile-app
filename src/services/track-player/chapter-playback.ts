import TrackPlayer, { State } from 'react-native-track-player';

import { fetchChapterAudioUrl, fetchChapterVerseTimings } from '@/api/services/audio';
import { fetchAudioChaptersForBook } from '@/api/services/chapters';

import type { ChapterPlaybackSession, ChapterPlaybackSnapshot } from './types';
import type { VerseTiming } from '@/types/audio';

/** Seconds back into the current verse before "previous" restarts it instead of stepping back. */
export const PREVIOUS_VERSE_RESTART_THRESHOLD = 3;
/** Small tolerance so we don't get stuck on the current marker when tapping "next". */
export const VERSE_BOUNDARY_EPSILON = 0.1;

const defaultSnapshot: ChapterPlaybackSnapshot = {
  isFetching: false,
  error: null,
  audioUrl: null,
  loadedChapter: null,
  verseTimings: [],
  didJustFinish: false,
};

let session: ChapterPlaybackSession | null = null;
let snapshot: ChapterPlaybackSnapshot = { ...defaultSnapshot };
let loadGeneration = 0;
let currentTime = 0;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(partial: Partial<ChapterPlaybackSnapshot>) {
  snapshot = { ...snapshot, ...partial };
  emit();
}

function formatTitle(bookName: string, chapter: number, verse: number | null): string {
  const name = bookName.trim();
  if (verse != null) return `${name} ${chapter}:${verse}`.trim();
  return `${name} ${chapter}`.trim();
}

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

export function subscribeChapterPlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChapterPlaybackSnapshot(): ChapterPlaybackSnapshot {
  return snapshot;
}

export function getSession(): ChapterPlaybackSession | null {
  return session;
}

export function setPlaybackCurrentTime(seconds: number) {
  currentTime = seconds;
}

export function getPlaybackCurrentTime(): number {
  return currentTime;
}

export function setSessionContext(params: {
  languageCode: string;
  bookSlug: string;
  bookName: string;
  chapterNumbers?: number[];
  activeChapter?: number;
}) {
  session = {
    languageCode: params.languageCode,
    bookSlug: params.bookSlug,
    bookName: params.bookName,
    chapterNumbers: params.chapterNumbers ?? session?.chapterNumbers ?? [],
    activeChapter: params.activeChapter ?? session?.activeChapter ?? 0,
  };
}

export function clearSession() {
  session = null;
  loadGeneration += 1;
  snapshot = { ...defaultSnapshot };
  emit();
}

/** Stops playback, clears the queue, and dismisses system media controls. */
export async function stopPlayback(): Promise<void> {
  try {
    await TrackPlayer.reset();
  } catch {
    // Player may not be initialized yet.
  }
  clearSession();
}

export async function ensureChapterNumbers(): Promise<void> {
  if (!session || session.chapterNumbers.length > 0) return;

  const chapters = await fetchAudioChaptersForBook(session.languageCode, session.bookSlug);
  session.chapterNumbers = chapters.map((item) => item.number).sort((a, b) => a - b);
}

export function resolveCurrentVerse(
  verseTimings: VerseTiming[],
  playbackPosition: number,
): number | null {
  if (verseTimings.length === 0) return null;

  let activeVerse: number | null = null;
  for (let i = 0; i < verseTimings.length; i += 1) {
    if (verseTimings[i].time <= playbackPosition + VERSE_BOUNDARY_EPSILON) {
      activeVerse = verseTimings[i].verse;
    } else {
      break;
    }
  }

  return activeVerse;
}

export async function updateNowPlayingVerse(chapter: number, verse: number | null): Promise<void> {
  if (!session) return;
  await TrackPlayer.updateNowPlayingMetadata({
    title: formatTitle(session.bookName, chapter, verse),
    artist: session.bookName || 'BIEL',
  });
}

export async function loadChapter(
  chapter: number,
  options?: { autoPlay?: boolean },
): Promise<void> {
  if (!session) {
    setSnapshot({ error: 'Missing book information' });
    return;
  }

  const generation = ++loadGeneration;
  setSnapshot({
    isFetching: true,
    error: null,
    audioUrl: null,
    loadedChapter: null,
    verseTimings: [],
    didJustFinish: false,
  });

  try {
    await ensureChapterNumbers();

    const [url, timings] = await Promise.all([
      fetchChapterAudioUrl(session.languageCode, session.bookSlug, chapter),
      fetchChapterVerseTimings(session.languageCode, session.bookSlug, chapter),
    ]);

    if (generation !== loadGeneration) return;

    if (!url) {
      setSnapshot({ isFetching: false, error: 'No audio available for this chapter' });
      return;
    }

    session.activeChapter = chapter;
    const firstVerse = timings[0]?.verse ?? null;

    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: `${session.bookSlug}-${chapter}`,
      url,
      title: formatTitle(session.bookName, chapter, firstVerse),
      artist: session.bookName || 'BIEL',
    });

    setSnapshot({
      isFetching: false,
      audioUrl: url,
      loadedChapter: chapter,
      verseTimings: timings,
      error: null,
    });

    if (options?.autoPlay) {
      await TrackPlayer.play();
    }
  } catch (err) {
    if (generation !== loadGeneration) return;
    const message = err instanceof Error ? err.message : 'Failed to load audio';
    setSnapshot({ isFetching: false, error: message });
  }
}

export async function handleQueueEnded(): Promise<void> {
  if (!session) return;

  setSnapshot({ didJustFinish: true });

  const nextChapter = getAdjacentChapterNumber(
    session.chapterNumbers,
    session.activeChapter,
    'next',
  );

  if (nextChapter == null) {
    await TrackPlayer.pause();
    return;
  }

  await loadChapter(nextChapter, { autoPlay: true });
}

export function clearDidJustFinish() {
  if (snapshot.didJustFinish) {
    setSnapshot({ didJustFinish: false });
  }
}

async function isAtChapterEnd(): Promise<boolean> {
  const { state } = await TrackPlayer.getPlaybackState();
  if (state === State.Ended) return true;
  if (snapshot.didJustFinish) return true;

  const progress = await TrackPlayer.getProgress();
  return progress.duration > 0 && progress.position >= progress.duration - 0.25;
}

async function restartChapterIfAtEnd(): Promise<void> {
  if (!(await isAtChapterEnd())) return;

  clearDidJustFinish();
  await seekToFirstVerse();
}

export async function play(): Promise<void> {
  if (!snapshot.audioUrl) return;
  await restartChapterIfAtEnd();
  await TrackPlayer.play();
}

export async function pause(): Promise<void> {
  await TrackPlayer.pause();
}

export async function togglePlay(): Promise<void> {
  if (!snapshot.audioUrl) return;
  const { state } = await TrackPlayer.getPlaybackState();
  if (state === State.Playing) {
    await TrackPlayer.pause();
    return;
  }

  await restartChapterIfAtEnd();
  await TrackPlayer.play();
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
}

export async function seekToVerse(verse: number): Promise<boolean> {
  const timing = snapshot.verseTimings.find((item) => item.verse === verse);
  if (!timing) return false;
  await TrackPlayer.seekTo(timing.time);
  return true;
}

export async function seekToFirstVerse(): Promise<void> {
  await TrackPlayer.seekTo(snapshot.verseTimings[0]?.time ?? 0);
}

export async function seekToLastVerse(duration: number): Promise<void> {
  if (snapshot.verseTimings.length > 0) {
    await TrackPlayer.seekTo(snapshot.verseTimings[snapshot.verseTimings.length - 1].time);
    return;
  }
  if (duration > 0) await TrackPlayer.seekTo(Math.max(0, duration - 1));
}

export async function seekToNextVerse(): Promise<boolean> {
  if (snapshot.verseTimings.length === 0) return false;
  const now = currentTime;
  const next = snapshot.verseTimings.find((item) => item.time > now + VERSE_BOUNDARY_EPSILON);
  if (!next) return false;
  await TrackPlayer.seekTo(next.time);
  return true;
}

export function canSeekToPreviousVerseInChapter(): boolean {
  if (snapshot.verseTimings.length === 0) return false;
  const playbackPosition = currentTime;

  let currentIdx = -1;
  for (let i = snapshot.verseTimings.length - 1; i >= 0; i -= 1) {
    if (snapshot.verseTimings[i].time <= playbackPosition + VERSE_BOUNDARY_EPSILON) {
      currentIdx = i;
      break;
    }
  }

  if (currentIdx <= 0) {
    const firstVerseTime = snapshot.verseTimings[0]?.time ?? 0;
    const offsetIntoVerse = playbackPosition - firstVerseTime;
    return offsetIntoVerse > PREVIOUS_VERSE_RESTART_THRESHOLD;
  }

  return true;
}

export async function seekToPreviousVerse(): Promise<boolean> {
  if (snapshot.verseTimings.length === 0) return false;
  const playbackPosition = currentTime;

  let currentIdx = -1;
  for (let i = snapshot.verseTimings.length - 1; i >= 0; i -= 1) {
    if (snapshot.verseTimings[i].time <= playbackPosition + VERSE_BOUNDARY_EPSILON) {
      currentIdx = i;
      break;
    }
  }

  if (currentIdx <= 0) {
    const firstVerseTime = snapshot.verseTimings[0]?.time ?? 0;
    const offsetIntoVerse = playbackPosition - firstVerseTime;
    if (offsetIntoVerse > PREVIOUS_VERSE_RESTART_THRESHOLD) {
      await TrackPlayer.seekTo(firstVerseTime);
      return true;
    }
    return false;
  }

  const offsetIntoVerse = playbackPosition - snapshot.verseTimings[currentIdx].time;
  const target =
    offsetIntoVerse > PREVIOUS_VERSE_RESTART_THRESHOLD
      ? snapshot.verseTimings[currentIdx]
      : snapshot.verseTimings[currentIdx - 1];
  await TrackPlayer.seekTo(target.time);
  return true;
}
