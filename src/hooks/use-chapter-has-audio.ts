import { useEffect, useState } from 'react';

import { getChapterAudioTotalBytes } from '@/api/services/offline-audio';

type UseChapterHasAudioParams = {
  languageCode?: string;
  bookSlug?: string;
  chapter?: number;
};

/** Whether a chapter has audio available (offline manifest or online). */
export function useChapterHasAudio({
  languageCode,
  bookSlug,
  chapter,
}: UseChapterHasAudioParams) {
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    if (!languageCode || !bookSlug || chapter == null) {
      setHasAudio(false);
      return;
    }

    let cancelled = false;

    getChapterAudioTotalBytes(languageCode, bookSlug, chapter)
      .then((totalBytes) => {
        if (!cancelled) setHasAudio(totalBytes > 0);
      })
      .catch(() => {
        if (!cancelled) setHasAudio(false);
      });

    return () => {
      cancelled = true;
    };
  }, [languageCode, bookSlug, chapter]);

  return hasAudio;
}
