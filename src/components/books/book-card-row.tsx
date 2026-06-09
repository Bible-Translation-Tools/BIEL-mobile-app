import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  DownloadMenuPopover,
  type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import { DELETE_ICON_NAME, DOWNLOAD_DONE_ICON_NAME, DOWNLOAD_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useBookAudioDownload } from '@/hooks/use-book-audio-download';
import { useBookDownload } from '@/hooks/use-book-download';
import { useDownloadErrorAlert } from '@/hooks/use-download-error-alert';
import { useTheme } from '@/hooks/use-theme';
import type { BookDownloadStatusChange } from '@/hooks/use-books';
import type { BookItem, ChapterItem } from '@/types/book';
import { resolveDownloadStatus } from '@/types/download';

import { ChapterGrid } from './chapter-grid';

type BookCardRowProps = {
  book: BookItem;
  languageCode: string;
  audioOnly: boolean;
  languageHasAudio: boolean;
  isExpanded?: boolean;
  chapters?: ChapterItem[];
  chaptersLoading?: boolean;
  onToggleExpand?: () => void;
  onChapterPress?: (chapter: ChapterItem) => void;
  onDownloadStatusChange?: (change: BookDownloadStatusChange) => void;
};

function areBookCardRowPropsEqual(
  prev: BookCardRowProps,
  next: BookCardRowProps,
): boolean {
  return (
    prev.book.id === next.book.id &&
    prev.book.name === next.book.name &&
    prev.book.downloadStatus === next.book.downloadStatus &&
    prev.book.audioDownloadStatus === next.book.audioDownloadStatus &&
    prev.languageCode === next.languageCode &&
    prev.audioOnly === next.audioOnly &&
    prev.languageHasAudio === next.languageHasAudio &&
    prev.isExpanded === next.isExpanded &&
    prev.chaptersLoading === next.chaptersLoading &&
    prev.chapters === next.chapters &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.onChapterPress === next.onChapterPress &&
    prev.onDownloadStatusChange === next.onDownloadStatusChange
  );
}

export const BookCardRow = memo(function BookCardRow({
  book,
  languageCode,
  audioOnly,
  languageHasAudio,
  isExpanded = false,
  chapters = [],
  chaptersLoading = false,
  onToggleExpand,
  onChapterPress,
  onDownloadStatusChange,
}: BookCardRowProps) {
  const theme = useTheme();
  const { t } = useTranslation('books');
  const { t: tc } = useTranslation('common');
  const isScriptureDownloaded = book.downloadStatus === 'downloaded';
  const isAudioDownloaded = book.audioDownloadStatus === 'downloaded';
  const downloadAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DownloadMenuAnchor | null>(null);
  const [downloadSessionActive, setDownloadSessionActive] = useState(false);

  const {
    isDownloading: isScriptureDownloading,
    progress: scriptureProgress,
    fileSizeLabel: scriptureFileSizeLabel,
    isChecking: isScriptureChecking,
    error: scriptureError,
    clearError: clearScriptureError,
    startDownload: startScriptureDownload,
    cancelDownload: cancelScriptureDownload,
    deleteScriptureDownload,
  } = useBookDownload({
    languageCode,
    bookSlug: book.slug,
    bookName: book.name,
    enabled: menuVisible || downloadSessionActive,
    onComplete: () =>
      onDownloadStatusChange?.({ bookSlug: book.slug, status: 'downloaded', kind: 'scripture' }),
    onDeleteComplete: () =>
      onDownloadStatusChange?.({ bookSlug: book.slug, status: 'pending', kind: 'scripture' }),
  });

  const {
    isDownloading: isAudioDownloading,
    progress: audioProgress,
    fileSizeLabel: audioFileSizeLabel,
    isDownloaded: isAudioDownloadedOnDevice,
    hasAudio,
    isChecking: isAudioChecking,
    error: audioError,
    clearError: clearAudioError,
    startDownload: startAudioDownload,
    cancelDownload: cancelAudioDownload,
    deleteAudioDownload,
  } = useBookAudioDownload({
    languageCode,
    bookSlug: book.slug,
    bookName: book.name,
    enabled: menuVisible || downloadSessionActive,
    onComplete: () =>
      onDownloadStatusChange?.({ bookSlug: book.slug, status: 'downloaded', kind: 'audio' }),
    onDeleteComplete: () =>
      onDownloadStatusChange?.({ bookSlug: book.slug, status: 'pending', kind: 'audio' }),
  });

  useEffect(() => {
    if (isScriptureDownloading || isAudioDownloading) {
      setDownloadSessionActive(true);
      return;
    }
    if (!menuVisible) {
      setDownloadSessionActive(false);
    }
  }, [isAudioDownloading, isScriptureDownloading, menuVisible]);

  useDownloadErrorAlert(scriptureError, clearScriptureError);
  useDownloadErrorAlert(audioError, clearAudioError);

  const isFullyDownloaded = audioOnly
    ? isAudioDownloaded
    : isScriptureDownloaded && (!languageHasAudio || isAudioDownloaded);

  const openDownloadMenu = useCallback(() => {
    Keyboard.dismiss();
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
    if (isScriptureDownloading) {
      cancelScriptureDownload();
      return;
    }

    if (isScriptureDownloaded) {
      await deleteScriptureDownload();
      closeDownloadMenu();
      return;
    }

    await startScriptureDownload();
    closeDownloadMenu();
  }, [
    cancelScriptureDownload,
    closeDownloadMenu,
    deleteScriptureDownload,
    isScriptureDownloaded,
    isScriptureDownloading,
    startScriptureDownload,
  ]);

  const isAnyDownloadActive = isScriptureDownloading || isAudioDownloading;

  const handleDownloadButtonPress = useCallback(() => {
    openDownloadMenu();
  }, [openDownloadMenu]);

  const handleAudioPress = useCallback(async () => {
    if (!hasAudio) return;

    if (isAudioDownloading) {
      cancelAudioDownload();
      return;
    }

    if (isAudioDownloadedOnDevice) {
      await deleteAudioDownload();
      closeDownloadMenu();
      return;
    }

    await startAudioDownload();
    closeDownloadMenu();
  }, [
    cancelAudioDownload,
    closeDownloadMenu,
    deleteAudioDownload,
    hasAudio,
    isAudioDownloadedOnDevice,
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
        {isFullyDownloaded ? (
          <IconSymbol
            name={DOWNLOAD_DONE_ICON_NAME}
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
            ? { ios: 'chevron.up', android: 'keyboard_arrow_up' }
            : { ios: 'chevron.down', android: 'keyboard_arrow_down' }
        }
        size={28}
        color={theme.iconTertiary}
      />
    </View>
  );

  const toggleProps = {
    onPress: onToggleExpand,
    accessibilityRole: 'button' as const,
    accessibilityLabel: isExpanded
      ? t('accessibility.collapse', { name: book.name })
      : t('accessibility.expand', { name: book.name }),
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
          onPress={handleDownloadButtonPress}
          accessibilityRole="button"
          accessibilityLabel={
            isAnyDownloadActive
              ? t('accessibility.downloadInProgress', { name: book.name })
              : isFullyDownloaded
                ? t('accessibility.delete', { name: book.name })
                : t('accessibility.download', { name: book.name })
          }>
          {isAnyDownloadActive ? (
            <ActivityIndicator size="small" color={theme.tabActive} />
          ) : isFullyDownloaded ? (
            <IconSymbol
              name={DELETE_ICON_NAME}
              size={24}
              color={theme.iconDanger}
            />
          ) : (
            <IconSymbol
              name={DOWNLOAD_ICON_NAME}
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
          scriptureFileSize: scriptureFileSizeLabel ?? tc('emDash'),
          scriptureStatus: resolveDownloadStatus(
            isScriptureDownloading,
            isScriptureDownloaded,
            isScriptureChecking,
          ),
          scriptureProgress,
          onScripturePress: handleScripturePress,
          audioFileSize: audioFileSizeLabel ?? tc('emDash'),
          audioStatus: resolveDownloadStatus(
            isAudioDownloading,
            isAudioDownloadedOnDevice,
            isAudioChecking,
          ),
          audioProgress,
          onAudioPress: handleAudioPress,
          audioDisabled: !hasAudio && !isAudioChecking,
        }}
      />
    </View>
  );
}, areBookCardRowPropsEqual);

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
