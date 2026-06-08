import { memo, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  DownloadMenuPopover,
  type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import { DOWNLOAD_DONE_ICON_NAME, DOWNLOAD_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { HomeLayout, Typography } from '@/constants/theme';
import { useLanguageAudioDownload } from '@/hooks/use-language-audio-download';
import { useLanguageDownload } from '@/hooks/use-language-download';
import { useDownloadErrorAlert } from '@/hooks/use-download-error-alert';
import { useTheme } from '@/hooks/use-theme';
import { resolveDownloadStatus } from '@/types/download';
import type { LanguageItem } from '@/types/language';

type LanguageCardRowProps = {
  language: LanguageItem;
  onPress?: () => void;
  onDownloadStatusChange?: () => void;
};

export const LanguageCardRow = memo(function LanguageCardRow({
  language,
  onPress,
  onDownloadStatusChange,
}: LanguageCardRowProps) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const { t: tc } = useTranslation('common');
  const isScriptureDownloaded = language.downloadStatus === 'downloaded';
  const canDownloadText = language.hasText;
  const canDownloadAudio = language.hasAudio;
  const canDownload = canDownloadText || canDownloadAudio;
  const downloadAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DownloadMenuAnchor | null>(null);

  const {
    isDownloading,
    progress,
    fileSizeLabel,
    isChecking: isScriptureChecking,
    error: scriptureError,
    clearError: clearScriptureError,
    startDownload,
    cancelDownload,
  } = useLanguageDownload({
    languageCode: language.code,
    enabled: canDownloadText,
    onComplete: onDownloadStatusChange,
  });

  const {
    isDownloading: isAudioDownloading,
    progress: audioProgress,
    fileSizeLabel: audioFileSizeLabel,
    isDownloaded: isAudioDownloaded,
    hasAudio,
    isChecking: isAudioChecking,
    error: audioError,
    clearError: clearAudioError,
    startDownload: startAudioDownload,
    cancelDownload: cancelAudioDownload,
  } = useLanguageAudioDownload({
    languageCode: language.code,
    enabled: canDownloadAudio,
    onComplete: onDownloadStatusChange,
  });

  useDownloadErrorAlert(scriptureError, clearScriptureError);
  useDownloadErrorAlert(audioError, clearAudioError);

  const needsAudioDownload = canDownloadAudio && hasAudio;
  const isFullyDownloaded =
    (!canDownloadText || isScriptureDownloaded) && (!needsAudioDownload || isAudioDownloaded);
  const isAnyDownloadActive = isDownloading || isAudioDownloading;

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
    if (isDownloading) {
      cancelDownload();
      return;
    }

    if (isScriptureDownloaded) {
      return;
    }

    await startDownload();
  }, [cancelDownload, isScriptureDownloaded, isDownloading, startDownload]);

  const handleAudioPress = useCallback(async () => {
    if (!hasAudio) return;

    if (isAudioDownloading) {
      cancelAudioDownload();
      return;
    }

    if (isAudioDownloaded) {
      return;
    }

    await startAudioDownload();
  }, [cancelAudioDownload, hasAudio, isAudioDownloaded, isAudioDownloading, startAudioDownload]);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
    },
    styles.cardShadow,
  ];

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [cardStyle, styles.mainCard, { opacity: pressed ? 0.9 : 1 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('accessibility.openLanguage', { name: language.name })}>
        <View style={styles.mainContent}>
          <View style={styles.titleLine}>
            <Text style={[styles.languageName, { color: theme.text }]} numberOfLines={1}>
              {language.nationalName}
            </Text>
            <View style={styles.mediaIcons}>
              {language.hasAudio && (
                <IconSymbol
                  name={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }}
                  size={18}
                  color={theme.iconTertiary}
                />
              )}
              {language.hasText && (
                <IconSymbol
                  name={{
                    ios: 'text.alignleft',
                    android: 'format_align_left',
                  }}
                  size={18}
                  color={theme.iconTertiary}
                />
              )}
            </View>
          </View>
          <Text style={[styles.languageCode, { color: theme.textSecondary }]} numberOfLines={1}>
            {`${language.code} - ${language.name}`}
          </Text>
        </View>
        <IconSymbol
          name={{ ios: 'chevron.right', android: 'keyboard_arrow_right' }}
          size={24}
          color={theme.iconTertiary}
        />
      </Pressable>

      {canDownload ? (
        <View ref={downloadAnchorRef} collapsable={false}>
          <Pressable
            style={({ pressed }) => [
              cardStyle,
              styles.downloadCard,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={openDownloadMenu}
            accessibilityRole="button"
            accessibilityLabel={
              isAnyDownloadActive
                ? t('accessibility.downloadInProgress', { name: language.name })
                : isFullyDownloaded
                  ? t('accessibility.downloaded', { name: language.name })
                  : t('accessibility.download', { name: language.name })
            }>
            {isAnyDownloadActive ? (
              <ActivityIndicator size="small" color={theme.tabActive} />
            ) : isFullyDownloaded ? (
              <IconSymbol
                name={DOWNLOAD_DONE_ICON_NAME}
                size={28}
                color={theme.iconSuccess}
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
      ) : null}

      <DownloadMenuPopover
        visible={menuVisible}
        anchor={menuAnchor}
        onClose={closeDownloadMenu}
        menuProps={{
          scriptureFileSize: fileSizeLabel ?? tc('emDash'),
          scriptureStatus: resolveDownloadStatus(
            isDownloading,
            isScriptureDownloaded,
            isScriptureChecking,
          ),
          scriptureProgress: progress,
          onScripturePress: canDownloadText ? handleScripturePress : undefined,
          scriptureDisabled: !canDownloadText,
          audioFileSize: audioFileSizeLabel ?? tc('emDash'),
          audioStatus: resolveDownloadStatus(
            isAudioDownloading,
            isAudioDownloaded,
            isAudioChecking,
          ),
          audioProgress,
          onAudioPress: handleAudioPress,
          audioDisabled: !hasAudio && !isAudioChecking,
          allowDelete: false,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.rowGap,
    width: '100%',
  },
  card: {
    borderRadius: HomeLayout.cardRadius,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  mainCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: HomeLayout.cardPaddingH,
    paddingVertical: HomeLayout.cardPaddingV,
    minWidth: 0,
  },
  mainContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.headerGap,
  },
  languageName: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  mediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
  },
  languageCode: {
    ...Typography.bodySm,
  },
  downloadCard: {
    width: HomeLayout.downloadButtonSize,
    height: HomeLayout.downloadButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
