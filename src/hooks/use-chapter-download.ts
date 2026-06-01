import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteChapterAudio,
  downloadChapterAudio,
  getChapterAudioTotalBytes,
  getDownloadedChapterAudioByteSize,
  isChapterAudioDownloaded,
} from '@/api/services/offline-audio';
import {
  deleteChapterScripture,
  downloadChapterScripture,
  getChapterScriptureFileSizeBytes,
  getDownloadedChapterScriptureByteSize,
  hasStandaloneChapterScripture,
  isChapterScriptureDownloaded,
} from '@/api/services/offline-text';
import { formatByteSize } from '@/api/services/whole-book-parser';
import { resolveDownloadStatus } from '@/types/download';

type UseChapterDownloadOptions = {
  languageCode: string | undefined;
  bookSlug: string | undefined;
  chapter: number | undefined;
};

export function useChapterDownload({
  languageCode,
  bookSlug,
  chapter,
}: UseChapterDownloadOptions) {
  const [scriptureDownloading, setScriptureDownloading] = useState(false);
  const [scriptureProgress, setScriptureProgress] = useState(0);
  const [scriptureFileSizeLabel, setScriptureFileSizeLabel] = useState<string | null>(null);
  const [scriptureDownloaded, setScriptureDownloaded] = useState(false);
  const [scriptureStandalone, setScriptureStandalone] = useState(false);

  const [audioDownloading, setAudioDownloading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioFileSizeLabel, setAudioFileSizeLabel] = useState<string | null>(null);
  const [audioDownloaded, setAudioDownloaded] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const scriptureAbortRef = useRef<AbortController | null>(null);
  const audioAbortRef = useRef<AbortController | null>(null);

  const refreshState = useCallback(async () => {
    if (!languageCode || !bookSlug || chapter == null) {
      setScriptureFileSizeLabel(null);
      setScriptureDownloaded(false);
      setScriptureStandalone(false);
      setAudioFileSizeLabel(null);
      setAudioDownloaded(false);
      setHasAudio(false);
      return;
    }

    const code = languageCode;
    const slug = bookSlug;
    const chapterNumber = chapter;

    const [scriptureDone, standalone, scriptureBytes, audioDone, audioBytes, audioTotal] =
      await Promise.all([
        isChapterScriptureDownloaded(code, slug, chapterNumber),
        hasStandaloneChapterScripture(code, slug, chapterNumber),
        getDownloadedChapterScriptureByteSize(code, slug, chapterNumber),
        isChapterAudioDownloaded(code, slug, chapterNumber),
        getDownloadedChapterAudioByteSize(code, slug, chapterNumber),
        getChapterAudioTotalBytes(code, slug, chapterNumber).catch(() => 0),
      ]);

    setScriptureDownloaded(scriptureDone);
    setScriptureStandalone(standalone);

    if (scriptureBytes != null) {
      setScriptureFileSizeLabel(formatByteSize(scriptureBytes));
    } else if (scriptureDone) {
      const remoteBytes = await getChapterScriptureFileSizeBytes(code, slug, chapterNumber).catch(
        () => 0,
      );
      setScriptureFileSizeLabel(remoteBytes > 0 ? formatByteSize(remoteBytes) : '—');
    } else {
      const remoteBytes = await getChapterScriptureFileSizeBytes(code, slug, chapterNumber).catch(
        () => 0,
      );
      setScriptureFileSizeLabel(remoteBytes > 0 ? formatByteSize(remoteBytes) : null);
    }

    setAudioDownloaded(audioDone);
    setHasAudio(audioTotal > 0);

    if (audioBytes != null) {
      setAudioFileSizeLabel(formatByteSize(audioBytes));
    } else {
      setAudioFileSizeLabel(audioTotal > 0 ? formatByteSize(audioTotal) : null);
    }
  }, [bookSlug, chapter, languageCode]);

  useEffect(() => {
    refreshState().catch(() => {
      setScriptureFileSizeLabel(null);
      setScriptureDownloaded(false);
      setScriptureStandalone(false);
      setAudioFileSizeLabel(null);
      setAudioDownloaded(false);
      setHasAudio(false);
    });
  }, [refreshState]);

  const cancelScriptureDownload = useCallback(() => {
    scriptureAbortRef.current?.abort();
    scriptureAbortRef.current = null;
    setScriptureDownloading(false);
    setScriptureProgress(0);
  }, []);

  const cancelAudioDownload = useCallback(() => {
    audioAbortRef.current?.abort();
    audioAbortRef.current = null;
    setAudioDownloading(false);
    setAudioProgress(0);
  }, []);

  const startScriptureDownload = useCallback(async () => {
    if (!languageCode || !bookSlug || chapter == null || scriptureDownloading) return;

    const controller = new AbortController();
    scriptureAbortRef.current = controller;
    setScriptureDownloading(true);
    setScriptureProgress(0);

    try {
      await downloadChapterScripture(languageCode, bookSlug, chapter, {
        signal: controller.signal,
        onProgress: setScriptureProgress,
      });
      await refreshState();
    } finally {
      scriptureAbortRef.current = null;
      setScriptureDownloading(false);
      setScriptureProgress(0);
    }
  }, [bookSlug, chapter, languageCode, refreshState, scriptureDownloading]);

  const deleteScriptureDownload = useCallback(async () => {
    if (!languageCode || !bookSlug || chapter == null) return;
    await deleteChapterScripture(languageCode, bookSlug, chapter);
    await refreshState();
  }, [bookSlug, chapter, languageCode, refreshState]);

  const startAudioDownload = useCallback(async () => {
    if (!languageCode || !bookSlug || chapter == null || audioDownloading || !hasAudio) return;

    const controller = new AbortController();
    audioAbortRef.current = controller;
    setAudioDownloading(true);
    setAudioProgress(0);

    try {
      await downloadChapterAudio(languageCode, bookSlug, chapter, {
        signal: controller.signal,
        onProgress: setAudioProgress,
      });
      await refreshState();
    } finally {
      audioAbortRef.current = null;
      setAudioDownloading(false);
      setAudioProgress(0);
    }
  }, [audioDownloading, bookSlug, chapter, hasAudio, languageCode, refreshState]);

  const deleteAudioDownload = useCallback(async () => {
    if (!languageCode || !bookSlug || chapter == null) return;
    await deleteChapterAudio(languageCode, bookSlug, chapter);
    await refreshState();
  }, [bookSlug, chapter, languageCode, refreshState]);

  return {
    scriptureFileSizeLabel,
    scriptureStatus: resolveDownloadStatus(scriptureDownloading, scriptureDownloaded),
    scriptureProgress,
    scriptureStandalone,
    startScriptureDownload,
    cancelScriptureDownload,
    deleteScriptureDownload,
    audioFileSizeLabel,
    audioStatus: resolveDownloadStatus(audioDownloading, audioDownloaded),
    audioProgress,
    hasAudio,
    startAudioDownload,
    cancelAudioDownload,
    deleteAudioDownload,
    refreshState,
  };
}
