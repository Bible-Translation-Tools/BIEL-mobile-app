import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    DownloadMenuPopover,
    type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import { DOWNLOAD_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { getToolbarTopInset, ReadingLayout } from '@/constants/theme';
import { useChapterDownload } from '@/hooks/use-chapter-download';
import { useDownloadErrorAlert } from '@/hooks/use-download-error-alert';
import { stopPlaybackBeforeLeave } from '@/hooks/use-stop-playback-on-leave';
import { useTheme } from '@/hooks/use-theme';

type AudioOnlyToolbarProps = {
  languageCode: string;
  bookSlug: string;
  chapter: number;
};

export function AudioOnlyToolbar({ languageCode, bookSlug, chapter }: AudioOnlyToolbarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation('reading');
  const { t: tc } = useTranslation('common');
  const downloadAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DownloadMenuAnchor | null>(null);

  const {
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

  useDownloadErrorAlert(audioError, clearAudioError);

  const openDownloadMenu = useCallback(() => {
    downloadAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuVisible(true);
    });
  }, []);

  const closeDownloadMenu = useCallback(() => {
    setMenuVisible(false);
    setMenuAnchor(null);
  }, []);

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
    <>
      <View
        style={[
          styles.header,
          { paddingTop: getToolbarTopInset(insets.top), backgroundColor: theme.background },
        ]}>
      <View style={styles.toolbar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            stopPlaybackBeforeLeave();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('goBack')}>
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow_back' }}
            size={28}
            color={theme.textHeading}
          />
          <Text style={[styles.backText, { color: theme.textHeading }]}>{tc('back')}</Text>
        </Pressable>

        <View ref={downloadAnchorRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [styles.downloadButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={openDownloadMenu}
            accessibilityRole="button"
            accessibilityLabel={t('downloadChapterAudio')}>
            <IconSymbol
              name={DOWNLOAD_ICON_NAME}
              size={28}
              color={theme.iconPrimary}
            />
          </Pressable>
        </View>
      </View>
      </View>

      <DownloadMenuPopover
        visible={menuVisible}
        anchor={menuAnchor}
        onClose={closeDownloadMenu}
        rightOffset={12}
        menuProps={{
          hideScripture: true,
          audioTitle: t('audio'),
          audioFileSize: audioFileSizeLabel ?? tc('emDash'),
          audioStatus,
          audioProgress,
          onAudioPress: handleAudioPress,
          audioDisabled: !hasAudio && audioStatus !== 'checking',
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ReadingLayout.padding,
    paddingTop: ReadingLayout.toolbarPaddingTop,
    paddingBottom: ReadingLayout.toolbarPaddingV,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
  },
  downloadButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
