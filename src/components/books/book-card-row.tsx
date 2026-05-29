import { memo, useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DownloadMenuPopover,
  type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useBookAudioDownload } from '@/hooks/use-book-audio-download';
import { useBookDownload } from '@/hooks/use-book-download';
import { useTheme } from '@/hooks/use-theme';
import type { BookItem, ChapterItem } from '@/types/book';
import { resolveDownloadStatus } from '@/types/download';

import { ChapterGrid } from './chapter-grid';

type BookCardRowProps = {
  book: BookItem;
  languageCode?: string;
  isExpanded?: boolean;
  chapters?: ChapterItem[];
  chaptersLoading?: boolean;
  onToggleExpand?: () => void;
  onChapterPress?: (chapter: ChapterItem) => void;
  onDownloadStatusChange?: () => void;
};

export const BookCardRow = memo(function BookCardRow({
  book,
  languageCode,
  isExpanded = false,
  chapters = [],
  chaptersLoading = false,
  onToggleExpand,
  onChapterPress,
  onDownloadStatusChange,
}: BookCardRowProps) {
  const theme = useTheme();
  const isDownloaded = book.downloadStatus === 'downloaded';
  const downloadAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DownloadMenuAnchor | null>(null);

  const { isDownloading, progress, fileSizeLabel, startDownload, cancelDownload, deleteDownload } =
    useBookDownload({
      languageCode,
      bookSlug: book.slug,
      onComplete: onDownloadStatusChange,
    });

  const {
    isDownloading: isAudioDownloading,
    progress: audioProgress,
    fileSizeLabel: audioFileSizeLabel,
    isDownloaded: isAudioDownloaded,
    hasAudio,
    startDownload: startAudioDownload,
    cancelDownload: cancelAudioDownload,
    deleteDownload: deleteAudioDownload,
  } = useBookAudioDownload({
    languageCode,
    bookSlug: book.slug,
    onComplete: onDownloadStatusChange,
  });

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

  const handleDeletePress = useCallback(async () => {
    try {
      await deleteDownload();
    } catch (err) {
      Alert.alert(
        'Delete failed',
        err instanceof Error ? err.message : 'Could not remove downloaded book',
      );
    }
  }, [deleteDownload]);

  const handleScripturePress = useCallback(async () => {
    if (isDownloading) {
      cancelDownload();
      return;
    }

    if (isDownloaded) {
      try {
        await deleteDownload();
      } catch (err) {
        Alert.alert(
          'Delete failed',
          err instanceof Error ? err.message : 'Could not remove downloaded book',
        );
      }
      return;
    }

    try {
      await startDownload();
      closeDownloadMenu();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      Alert.alert(
        'Download failed',
        err instanceof Error ? err.message : 'Could not download book',
      );
    }
  }, [
    cancelDownload,
    closeDownloadMenu,
    deleteDownload,
    isDownloaded,
    isDownloading,
    startDownload,
  ]);

  const handleAudioPress = useCallback(async () => {
    if (!hasAudio) return;

    if (isAudioDownloading) {
      cancelAudioDownload();
      return;
    }

    if (isAudioDownloaded) {
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
      closeDownloadMenu();
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
    cancelAudioDownload,
    closeDownloadMenu,
    deleteAudioDownload,
    hasAudio,
    isAudioDownloaded,
    isAudioDownloading,
    startAudioDownload,
  ]);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
    },
    styles.cardShadow,
  ];

  const header = (
    <View style={styles.header}>
      <View style={styles.titleGroup}>
        {isDownloaded ? (
          <IconSymbol
            name={{
              ios: 'checkmark.circle.fill',
              android: 'download_done',
              web: 'download_done',
            }}
            size={28}
            color={theme.iconSuccess}
          />
        ) : null}
        <Text style={[styles.bookName, { color: theme.text }]} numberOfLines={1}>
          {book.name}
        </Text>
      </View>
      <IconSymbol
        name={
          isExpanded
            ? { ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }
            : { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }
        }
        size={28}
        color={theme.iconTertiary}
      />
    </View>
  );

  const toggleProps = {
    onPress: onToggleExpand,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `${isExpanded ? 'Collapse' : 'Expand'} ${book.name}`,
    accessibilityState: { expanded: isExpanded },
  };

  return (
    <View style={styles.row}>
      {isExpanded ? (
        <View style={[cardStyle, styles.bookCard]}>
          <Pressable
            style={({ pressed }) => [
              styles.headerHitArea,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            {...toggleProps}>
            {header}
          </Pressable>
          <ChapterGrid
            chapters={chapters}
            loading={chaptersLoading}
            onChapterPress={onChapterPress}
          />
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            cardStyle,
            styles.bookCard,
            styles.bookCardCollapsed,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          {...toggleProps}>
          {header}
        </Pressable>
      )}

      <View ref={downloadAnchorRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [
            cardStyle,
            styles.downloadCard,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={isDownloaded ? handleDeletePress : openDownloadMenu}
          accessibilityRole="button"
          accessibilityLabel={
            isDownloaded ? `Delete ${book.name}` : `Download ${book.name}`
          }>
          {isDownloaded ? (
            <IconSymbol
              name={{ ios: 'trash', android: 'delete', web: 'delete' }}
              size={24}
              color={theme.iconDanger}
            />
          ) : (
            <IconSymbol
              name={{
                ios: 'arrow.down.circle',
                android: 'file_download',
                web: 'file_download',
              }}
              size={28}
              color={theme.iconPrimary}
            />
          )}
        </Pressable>
      </View>

      <DownloadMenuPopover
        visible={menuVisible}
        anchor={menuAnchor}
        onClose={closeDownloadMenu}
        menuProps={{
          scriptureFileSize: fileSizeLabel ?? '—',
          scriptureStatus: resolveDownloadStatus(isDownloading, isDownloaded),
          scriptureProgress: progress,
          onScripturePress: handleScripturePress,
          audioFileSize: audioFileSizeLabel ?? '—',
          audioStatus: resolveDownloadStatus(isAudioDownloading, isAudioDownloaded),
          audioProgress,
          onAudioPress: handleAudioPress,
          audioDisabled: !hasAudio,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BookLayout.rowGap,
    width: '100%',
  },
  bookCardCollapsed: {
    minHeight: BookLayout.bookDownloadButtonSize,
    justifyContent: 'center',
  },
  card: {
    borderRadius: BookLayout.cardRadius,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  bookCard: {
    flex: 1,
    gap: BookLayout.headerGap,
    padding: BookLayout.cardPaddingH,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  headerHitArea: {
    minHeight: 28,
    justifyContent: 'center',
    marginHorizontal: -BookLayout.cardPaddingH,
    marginTop: -BookLayout.cardPaddingH,
    paddingHorizontal: BookLayout.cardPaddingH,
    paddingTop: BookLayout.cardPaddingH,
    marginBottom: 0,
    paddingBottom: BookLayout.headerGap,
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  bookName: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  downloadCard: {
    width: BookLayout.bookDownloadButtonSize,
    height: BookLayout.bookDownloadButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
