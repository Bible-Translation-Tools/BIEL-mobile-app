/** Audio URL, verse timings, and chapters that have audio. Offline first. */
export {
  getAudioChaptersForBook,
} from './chapter-audio';

/** Stop playback when the app is backgrounded outside the reader. */
export { initPlaybackAppLifecycle, setReadingScreenFocused } from './background-stop';

/** In-session chapter playback: load, play, seek, and lock-screen metadata. */
export {
  canSeekToNextVerseInChapter,
  canSeekToPreviousVerseInChapter,
  clearDidJustFinish,
  clearSession,
  consumeSuppressStopPlayback,
  consumeUserRequestedChapter,
  getActivePlaybackReadRoute,
  getChapterPlaybackSnapshot,
  getResumedPlaybackChapter,
  loadChapter,
  markNotificationResume,
  pause,
  play,
  requestChapterLoad,
  seekTo,
  seekToFirstVerse,
  seekToLastVerse,
  seekToNextVerse,
  seekToPreviousVerse,
  seekToVerse,
  setPlaybackCurrentTime,
  setSessionContext,
  shouldKeepLoadedChapter,
  stopPlayback,
  subscribeChapterPlayback,
  togglePlay,
  updateNowPlayingVerse,
} from './session';
