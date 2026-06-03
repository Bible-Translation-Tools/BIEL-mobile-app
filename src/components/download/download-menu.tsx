import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { DownloadStatus } from '@/types/download';

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
}: DownloadMenuProps) {
  const theme = useTheme();
  const { t } = useTranslation('download');
  const { t: tc } = useTranslation('common');

  const resolvedScriptureTitle = scriptureTitle ?? t('allScripture');
  const resolvedAudioTitle = audioTitle ?? t('allAudio');
  const emDash = tc('emDash');

  return (
    <View
      style={[
        styles.menu,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        styles.menuShadow,
      ]}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>{t('title')}</Text>
      {hideScripture ? null : (
        <DownloadStatusOption
          title={resolvedScriptureTitle}
          fileSize={scriptureFileSize ?? emDash}
          status={scriptureStatus}
          progress={scriptureProgress}
          onActionPress={onScripturePress}
          disabled={scriptureDisabled}
          allowDelete={allowDelete}
        />
      )}
      <DownloadStatusOption
        title={resolvedAudioTitle}
        fileSize={audioFileSize ?? emDash}
        status={audioStatus}
        progress={audioProgress}
        onActionPress={onAudioPress}
        disabled={audioDisabled}
        allowDelete={allowDelete}
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
