import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DownloadMenuPopover,
  type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import {
  TextSettingsPopover,
  type TextSettingsAnchor,
} from '@/components/reading/text-settings-popover';
import {
  SettingsToolbarButton,
  type SettingsToolbarButtonRef,
} from '@/components/settings/settings-toolbar-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout, Typography } from '@/constants/theme';
import { useChapterDownload } from '@/hooks/use-chapter-download';
import { useDownloadErrorAlert } from '@/hooks/use-download-error-alert';
import { useTheme } from '@/hooks/use-theme';

export type ChapterDownloadContext = {
  languageCode: string;
  bookSlug: string;
  chapter: number;
};

type ReadingToolbarProps = {
  chapterTitle?: string;
  downloadContext?: ChapterDownloadContext;
};

type ReadingToolbarDownloadButtonProps = ChapterDownloadContext;

function ReadingToolbarDownloadButton({
  languageCode,
  bookSlug,
  chapter,
}: ReadingToolbarDownloadButtonProps) {
  const theme = useTheme();
  const downloadAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DownloadMenuAnchor | null>(null);

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

  const handleScripturePress = useCallback(async () => {
    if (scriptureStatus === 'downloading') {
      cancelScriptureDownload();
      return;
    }

    if (scriptureStatus === 'downloaded') {
      if (!scriptureStandalone) {
        Alert.alert(
          'Part of full book download',
          'This chapter is available offline because the full book was downloaded. Remove it from the book list.',
        );
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
    <>
      <View ref={downloadAnchorRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={openDownloadMenu}
          accessibilityRole="button"
          accessibilityLabel="Download chapter">
          <IconSymbol
            name={{ ios: 'arrow.down.circle', android: 'file_download', web: 'file_download' }}
            size={ReadingLayout.toolbarIconSize}
            color={theme.iconPrimary}
          />
        </Pressable>
      </View>

      <DownloadMenuPopover
        visible={menuVisible}
        anchor={menuAnchor}
        onClose={closeDownloadMenu}
        menuProps={{
          scriptureTitle: 'Scripture',
          scriptureFileSize: scriptureFileSizeLabel ?? '—',
          scriptureStatus,
          scriptureProgress,
          onScripturePress: handleScripturePress,
          audioTitle: 'Audio',
          audioFileSize: audioFileSizeLabel ?? '—',
          audioStatus,
          audioProgress,
          onAudioPress: handleAudioPress,
          audioDisabled: !hasAudio && audioStatus !== 'checking',
        }}
      />
    </>
  );
}

function DisabledDownloadButton() {
  const theme = useTheme();

  return (
    <View style={styles.iconButtonDisabledWrapper}>
      <View style={[styles.iconButton, styles.iconButtonDisabled]}>
        <IconSymbol
          name={{ ios: 'arrow.down.circle', android: 'file_download', web: 'file_download' }}
          size={ReadingLayout.toolbarIconSize}
          color={theme.iconPrimary}
        />
      </View>
    </View>
  );
}

export function ReadingToolbar({ chapterTitle, downloadContext }: ReadingToolbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const isElevated = chapterTitle != null;
  const textSettingsAnchorRef = useRef<View>(null);
  const systemSettingsRef = useRef<SettingsToolbarButtonRef>(null);
  const [textSettingsVisible, setTextSettingsVisible] = useState(false);
  const [textSettingsAnchor, setTextSettingsAnchor] = useState<TextSettingsAnchor | null>(null);

  const openTextSettings = useCallback(() => {
    if (textSettingsVisible) {
      setTextSettingsVisible(false);
      setTextSettingsAnchor(null);
      return;
    }

    systemSettingsRef.current?.close();
    textSettingsAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setTextSettingsAnchor({ x, y, width, height });
      setTextSettingsVisible(true);
    });
  }, [textSettingsVisible]);

  const closeTextSettings = useCallback(() => {
    setTextSettingsVisible(false);
    setTextSettingsAnchor(null);
  }, []);

  return (
    <View
      style={[
        styles.toolbar,
        isElevated && [
          styles.toolbarElevated,
          {
            backgroundColor: theme.backgroundAccent,
            shadowColor: '#000',
          },
        ],
      ]}>
      <View style={styles.leading}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={ReadingLayout.toolbarIconSize}
            color={theme.iconPrimary}
          />
        </Pressable>
        {chapterTitle ? (
          <Text
            style={[styles.chapterTitle, { color: theme.text }]}
            numberOfLines={1}>
            {chapterTitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.trailing}>
        <View ref={textSettingsAnchorRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              textSettingsVisible && {
                borderColor: theme.textLabel,
                backgroundColor: theme.backgroundElement,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={openTextSettings}
            accessibilityRole="button"
            accessibilityLabel="Text settings"
            accessibilityState={{ expanded: textSettingsVisible }}>
            <IconSymbol
              name={{ ios: 'textformat.size', android: 'format-size', web: 'format-size' }}
              size={ReadingLayout.toolbarIconSize}
              color={theme.iconPrimary}
            />
          </Pressable>
        </View>
        {downloadContext ? (
          <ReadingToolbarDownloadButton
            key={`${downloadContext.languageCode}:${downloadContext.bookSlug}:${downloadContext.chapter}`}
            languageCode={downloadContext.languageCode}
            bookSlug={downloadContext.bookSlug}
            chapter={downloadContext.chapter}
          />
        ) : (
          <DisabledDownloadButton />
        )}
        <SettingsToolbarButton
          ref={systemSettingsRef}
          iconSize={ReadingLayout.toolbarSettingsIconSize}
          hitSize={ReadingLayout.toolbarIconSize}
          onOpen={() => {
            setTextSettingsVisible(false);
            setTextSettingsAnchor(null);
          }}
        />
      </View>

      <TextSettingsPopover
        visible={textSettingsVisible}
        anchor={textSettingsAnchor}
        onClose={closeTextSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ReadingLayout.toolbarHeight,
    paddingHorizontal: ReadingLayout.toolbarPaddingH,
    paddingVertical: ReadingLayout.toolbarPaddingV,
  },
  toolbarElevated: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarLeadingGap,
    minWidth: 0,
  },
  chapterTitle: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarTrailingGap,
    flexShrink: 0,
  },
  iconButton: {
    width: ReadingLayout.toolbarIconSize,
    height: ReadingLayout.toolbarIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconButtonDisabledWrapper: {
    opacity: 0.4,
  },
  iconButtonDisabled: {
    opacity: 1,
  },
});
