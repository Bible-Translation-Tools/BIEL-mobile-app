import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { DownloadMenu } from '@/components/download/download-menu';
import { useChapterDownload } from '@/hooks/use-chapter-download';
import { useDownloadErrorAlert } from '@/hooks/use-download-error-alert';

export type ChapterDownloadContext = {
  languageCode: string;
  bookSlug: string;
  chapter: number;
};

type ChapterDownloadMenuProps = ChapterDownloadContext & {
  embedded?: boolean;
  audioOnly?: boolean;
};

export const ChapterDownloadMenu = memo(function ChapterDownloadMenu({
  languageCode,
  bookSlug,
  chapter,
  embedded = false,
  audioOnly = false,
}: ChapterDownloadMenuProps) {
  const { t } = useTranslation('reading');
  const { t: tc } = useTranslation('common');

  const {
    scriptureFileSizeLabel,
    scriptureStatus,
    scriptureProgress,
    scriptureStandalone,
    startScriptureDownload,
    cancelScriptureDownload,
    deleteScriptureDownload,
    scriptureError,
    clearScriptureError,
    audioFileSizeLabel,
    audioStatus,
    audioProgress,
    hasAudio,
    startAudioDownload,
    cancelAudioDownload,
    deleteAudioDownload,
    audioError,
    clearAudioError,
  } = useChapterDownload({ languageCode, bookSlug, chapter });

  useDownloadErrorAlert(scriptureError, clearScriptureError);
  useDownloadErrorAlert(audioError, clearAudioError);

  const handleScripturePress = useCallback(async () => {
    if (scriptureStatus === 'downloading') {
      cancelScriptureDownload();
      return;
    }

    if (scriptureStatus === 'downloaded') {
      if (!scriptureStandalone) {
        Alert.alert(t('partOfFullBookTitle'), t('partOfFullBookMessage'));
        return;
      }

      await deleteScriptureDownload();
      return;
    }

    await startScriptureDownload();
  }, [
    cancelScriptureDownload,
    deleteScriptureDownload,
    scriptureStandalone,
    scriptureStatus,
    startScriptureDownload,
    t,
  ]);

  const handleAudioPress = useCallback(async () => {
    if (!hasAudio) return;

    if (audioStatus === 'downloading') {
      cancelAudioDownload();
      return;
    }

    if (audioStatus === 'downloaded') {
      await deleteAudioDownload();
      return;
    }

    await startAudioDownload();
  }, [
    audioStatus,
    cancelAudioDownload,
    deleteAudioDownload,
    hasAudio,
    startAudioDownload,
  ]);

  return (
    <DownloadMenu
      embedded={embedded}
      hideScripture={audioOnly}
      textTitle={t('scripture')}
      scriptureFileSize={scriptureFileSizeLabel ?? tc('emDash')}
      scriptureStatus={scriptureStatus}
      scriptureProgress={scriptureProgress}
      onScripturePress={handleScripturePress}
      audioTitle={t('audio')}
      audioFileSize={audioFileSizeLabel ?? tc('emDash')}
      audioStatus={audioStatus}
      audioProgress={audioProgress}
      onAudioPress={handleAudioPress}
      audioDisabled={!hasAudio && audioStatus !== 'checking'}
    />
  );
});
