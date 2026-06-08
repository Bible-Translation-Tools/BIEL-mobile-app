import { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { DELETE_ICON_NAME, DOWNLOAD_DONE_ICON_NAME, DOWNLOAD_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DownloadStatus } from '@/types/download';

type DownloadStatusOptionProps = {
  title: string;
  fileSize: string;
  status?: DownloadStatus;
  progress?: number;
  onActionPress?: () => void;
  /** When true, the option is unavailable and shown muted. */
  disabled?: boolean;
  /** When false, downloaded rows show status only (no trash / delete action). Default true. */
  allowDelete?: boolean;
};

export const DownloadStatusOption = memo(function DownloadStatusOption({
  title,
  fileSize,
  status = 'pending',
  progress = 0,
  onActionPress,
  disabled = false,
  allowDelete = true,
}: DownloadStatusOptionProps) {
  const theme = useTheme();
  const { t } = useTranslation('download');
  const { t: tc } = useTranslation('common');
  const isChecking = status === 'checking';
  const isDownloading = status === 'downloading';
  const isDownloaded = status === 'downloaded';
  const isUnavailable = disabled && !isChecking;
  const isMuted = isUnavailable || isChecking;
  const showProgress = isDownloading || isDownloaded;
  const progressWidth = `${Math.min(Math.max(isDownloaded ? 1 : progress, 0), 1) * 100}%` as DimensionValue;
  const canPress =
    Boolean(onActionPress) &&
    !isChecking &&
    !isUnavailable &&
    (allowDelete || !isDownloaded);

  const titleColor = isMuted ? theme.textSecondary : theme.text;
  const metaColor = isMuted ? theme.iconTertiary : theme.textSecondary;

  const accessibilityLabel = isChecking
    ? t('accessibility.checking', { title })
    : isDownloading
      ? t('accessibility.cancel', { title })
      : isDownloaded
        ? allowDelete
          ? t('accessibility.delete', { title })
          : t('accessibility.downloaded', { title })
        : isUnavailable
          ? t('accessibility.unavailable', { title })
          : t('accessibility.download', { title });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          minHeight: showProgress ? undefined : DownloadMenuLayout.optionMinHeight,
          opacity: isUnavailable ? 0.5 : pressed && canPress ? 0.7 : 1,
        },
      ]}
      disabled={!canPress}
      onPress={canPress ? onActionPress : undefined}
      accessibilityRole={canPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !canPress }}>
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.fileSize, { color: metaColor }]}>
              {isChecking ? tc('emDash') : fileSize}
            </Text>
            {isChecking ? (
              <Text style={[styles.status, { color: metaColor }]}>{t('checking')}</Text>
            ) : null}
            {isDownloading ? (
              <Text style={[styles.status, { color: theme.tabActive }]}>{t('downloading')}</Text>
            ) : null}
            {isDownloaded ? (
              <Text style={[styles.status, { color: theme.iconSuccess }]}>{t('downloaded')}</Text>
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
        {isChecking ? (
          <ActivityIndicator size="small" color={theme.iconTertiary} />
        ) : isDownloaded ? (
          allowDelete ? (
            <IconSymbol
              name={DELETE_ICON_NAME}
              size={DownloadMenuLayout.deleteIconSize}
              color={theme.iconDanger}
            />
          ) : (
            <IconSymbol
              name={DOWNLOAD_DONE_ICON_NAME}
              size={DownloadMenuLayout.iconSize}
              color={theme.iconSuccess}
            />
          )
        ) : isUnavailable ? null : (
          <IconSymbol
            name={
              isDownloading
                ? { ios: 'xmark', android: 'close' }
                : DOWNLOAD_ICON_NAME
            }
            size={DownloadMenuLayout.iconSize}
            color={isMuted ? theme.iconTertiary : theme.iconPrimary}
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
