import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DownloadMenuPopover,
  type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout } from '@/constants/theme';
import { useChapterDownload } from '@/hooks/use-chapter-download';
import { useTheme } from '@/hooks/use-theme';

type AudioOnlyToolbarProps = {
  languageCode?: string;
  bookSlug?: string;
  chapter?: number;
};

export function AudioOnlyToolbar({ languageCode, bookSlug, chapter }: AudioOnlyToolbarProps) {
  const theme = useTheme();
  const router = useRouter();
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
  } = useChapterDownload({ languageCode, bookSlug, chapter });

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
      try {
        await deleteAudioDownload();
      } catch (err) {
        Alert.alert(
          'Delete failed',
          err instanceof Error ? err.message : 'Could not remove downloaded audio',
        );
      }
      return;
    }

    try {
      await startAudioDownload();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      Alert.alert(
        'Download failed',
        err instanceof Error ? err.message : 'Could not download audio',
      );
    }
  }, [
    audioStatus,
    cancelAudioDownload,
    deleteAudioDownload,
    hasAudio,
    startAudioDownload,
  ]);

  const canOpenDownloadMenu = languageCode != null && bookSlug != null && chapter != null;

  return (
    <>
      <View style={styles.toolbar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={28}
            color={theme.textHeading}
          />
          <Text style={[styles.backText, { color: theme.textHeading }]}>Back</Text>
        </Pressable>

        <View ref={downloadAnchorRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [
              styles.downloadButton,
              { opacity: pressed ? 0.7 : 1 },
              !canOpenDownloadMenu && styles.downloadButtonDisabled,
            ]}
            onPress={canOpenDownloadMenu ? openDownloadMenu : undefined}
            disabled={!canOpenDownloadMenu}
            accessibilityRole="button"
            accessibilityLabel="Download chapter audio">
            <IconSymbol
              name={{ ios: 'arrow.down.circle', android: 'file_download', web: 'file_download' }}
              size={28}
              color={theme.iconPrimary}
            />
          </Pressable>
        </View>
      </View>

      <DownloadMenuPopover
        visible={menuVisible}
        anchor={menuAnchor}
        onClose={closeDownloadMenu}
        menuProps={{
          hideScripture: true,
          audioTitle: 'Audio',
          audioFileSize: audioFileSizeLabel ?? '—',
          audioStatus,
          audioProgress,
          onAudioPress: handleAudioPress,
          audioDisabled: !hasAudio,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ReadingLayout.padding,
    paddingVertical: ReadingLayout.padding,
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
  downloadButtonDisabled: {
    opacity: 0.4,
  },
});
