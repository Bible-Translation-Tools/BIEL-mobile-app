import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { DownloadStatus } from '@/types/download';

import { DeleteDownloadDialog } from './delete-download-dialog';
import { DownloadStatusOption } from './download-status-option';

type DownloadMenuProps = {
  scriptureTitle?: string;
  scriptureFileSize?: string;
  scriptureStatus?: DownloadStatus;
  scriptureProgress?: number;
  onScripturePress?: () => void;
  scriptureDisabled?: boolean;
  allowDelete?: boolean;
  audioTitle?: string;
  audioFileSize?: string;
  audioStatus?: DownloadStatus;
  audioProgress?: number;
  onAudioPress?: () => void;
  audioDisabled?: boolean;
  hideScripture?: boolean;
  embedded?: boolean;
};

export const DownloadMenu = memo(function DownloadMenu({
  scriptureTitle,
  scriptureFileSize,
  scriptureStatus = 'pending',
  scriptureProgress = 0,
  onScripturePress,
  scriptureDisabled = false,
  allowDelete = true,
  audioTitle,
  audioFileSize,
  audioStatus = 'pending',
  audioProgress = 0,
  onAudioPress,
  audioDisabled = false,
  hideScripture = false,
  embedded = false,
}: DownloadMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation('download');
  const { t: tc } = useTranslation('common');

  const resolvedScriptureTitle = scriptureTitle ?? t('allScripture');
  const resolvedAudioTitle = audioTitle ?? t('allAudio');
  const emDash = tc('emDash');
  const [pendingDelete, setPendingDelete] = useState<(() => void) | null>(null);

  const confirmDelete = (onConfirm?: () => void) => {
    if (!onConfirm) return;
    setPendingDelete(() => onConfirm);
  };

  const closeConfirm = () => setPendingDelete(null);

  const onScriptureActionPress =
    allowDelete && scriptureStatus === 'downloaded'
      ? () => confirmDelete(onScripturePress)
      : onScripturePress;
  const onAudioActionPress =
    allowDelete && audioStatus === 'downloaded'
      ? () => confirmDelete(onAudioPress)
      : onAudioPress;

  return (
    <View
      style={[
        styles.menu,
        !embedded && {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        !embedded && styles.menuShadow,
        embedded && styles.menuEmbedded,
      ]}>
      {!embedded ? (
        <Text style={[styles.title, { color: theme.textSecondary }]}>{t('title')}</Text>
      ) : null}
      {hideScripture ? null : (
        <DownloadStatusOption
          title={resolvedScriptureTitle}
          fileSize={scriptureFileSize ?? emDash}
          status={scriptureStatus}
          progress={scriptureProgress}
          onActionPress={onScriptureActionPress}
          disabled={scriptureDisabled}
          allowDelete={allowDelete}
        />
      )}
      <DownloadStatusOption
        title={resolvedAudioTitle}
        fileSize={audioFileSize ?? emDash}
        status={audioStatus}
        progress={audioProgress}
        onActionPress={onAudioActionPress}
        disabled={audioDisabled}
        allowDelete={allowDelete}
      />
      <DeleteDownloadDialog
        visible={pendingDelete != null}
        onCancel={closeConfirm}
        onConfirm={() => {
          pendingDelete?.();
          closeConfirm();
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  menu: {
    borderRadius: DownloadMenuLayout.menuRadius,
    borderWidth: 1,
    padding: DownloadMenuLayout.menuPadding,
    gap: DownloadMenuLayout.menuGap,
  },
  menuEmbedded: {
    borderWidth: 0,
    padding: 0,
    width: '100%',
  },
  menuShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 8,
  },
  title: {
    ...Typography.headingH7,
    width: '100%',
  },
});
