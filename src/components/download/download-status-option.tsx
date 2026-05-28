import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DownloadStatusState = 'default' | 'downloading';

type DownloadStatusOptionProps = {
  title: string;
  fileSize: string;
  state?: DownloadStatusState;
  progress?: number;
  onActionPress?: () => void;
};

export const DownloadStatusOption = memo(function DownloadStatusOption({
  title,
  fileSize,
  state = 'default',
  progress = 0,
  onActionPress,
}: DownloadStatusOptionProps) {
  const theme = useTheme();
  const isDownloading = state === 'downloading';
  const progressWidth = `${Math.min(Math.max(progress, 0), 1) * 100}%` as DimensionValue;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          minHeight: isDownloading ? undefined : DownloadMenuLayout.optionMinHeight,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={onActionPress}
      accessibilityRole="button"
      accessibilityLabel={
        isDownloading ? `Cancel ${title} download` : `Download ${title}`
      }>
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.fileSize, { color: theme.textSecondary }]}>{fileSize}</Text>
          </View>
          {isDownloading ? (
            <Text style={[styles.processing, { color: theme.tabActive }]}>Processing...</Text>
          ) : null}
        </View>
        {isDownloading ? (
          <View
            style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}
            accessibilityRole="progressbar">
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.tabActive, width: progressWidth },
              ]}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.actionIcon}>
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
    gap: 5,
  },
  header: {
    gap: 3,
  },
  title: {
    ...Typography.headingH7,
  },
  fileSize: {
    ...Typography.bodyXs,
  },
  processing: {
    ...Typography.bodyXs,
    textAlign: 'right',
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
