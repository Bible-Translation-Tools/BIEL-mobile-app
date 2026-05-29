import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DownloadStatus } from '@/types/download';

type DownloadStatusOptionProps = {
  title: string;
  fileSize: string;
  status?: DownloadStatus;
  progress?: number;
  onActionPress?: () => void;
};

export const DownloadStatusOption = memo(function DownloadStatusOption({
  title,
  fileSize,
  status = 'pending',
  progress = 0,
  onActionPress,
}: DownloadStatusOptionProps) {
  const theme = useTheme();
  const isDownloading = status === 'downloading';
  const isDownloaded = status === 'downloaded';
  const showProgress = isDownloading || isDownloaded;
  const progressWidth = `${Math.min(Math.max(isDownloaded ? 1 : progress, 0), 1) * 100}%` as DimensionValue;

  const accessibilityLabel = isDownloading
    ? `Cancel ${title} download`
    : isDownloaded
      ? `Delete downloaded ${title}`
      : `Download ${title}`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          minHeight: showProgress ? undefined : DownloadMenuLayout.optionMinHeight,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={onActionPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.fileSize, { color: theme.textSecondary }]}>{fileSize}</Text>
            {isDownloading ? (
              <Text style={[styles.status, { color: theme.tabActive }]}>Downloading...</Text>
            ) : null}
            {isDownloaded ? (
              <Text style={[styles.status, { color: theme.iconSuccess }]}>Downloaded</Text>
            ) : null}
          </View>
        </View>
        {showProgress ? (
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isDownloaded
                  ? DownloadMenuLayout.progressSuccessTrack
                  : theme.backgroundSelected,
              },
            ]}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 1,
              now: isDownloaded ? 1 : progress,
            }}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isDownloaded ? theme.iconSuccess : theme.tabActive,
                  width: progressWidth,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.actionIcon}>
        {isDownloaded ? (
          <IconSymbol
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            size={DownloadMenuLayout.deleteIconSize}
            color={theme.iconDanger}
          />
        ) : (
          <IconSymbol
            name={
              isDownloading
                ? { ios: 'xmark', android: 'close', web: 'close' }
                : {
                    ios: 'arrow.down.circle',
                    android: 'file_download',
                    web: 'file_download',
                  }
            }
            size={DownloadMenuLayout.iconSize}
            color={theme.iconPrimary}
          />
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DownloadMenuLayout.optionGap,
    padding: DownloadMenuLayout.optionPadding,
    borderRadius: DownloadMenuLayout.optionRadius,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  textBlock: {
    gap: 3,
  },
  title: {
    ...Typography.headingH7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fileSize: {
    ...Typography.bodyXs,
    flexShrink: 1,
  },
  status: {
    ...Typography.bodyXs,
    flexShrink: 0,
  },
  progressTrack: {
    height: DownloadMenuLayout.progressHeight,
    borderRadius: 80,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 80,
  },
  actionIcon: {
    width: DownloadMenuLayout.iconSize,
    height: DownloadMenuLayout.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
