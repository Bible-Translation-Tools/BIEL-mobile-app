import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
};

export const DownloadMenu = memo(function DownloadMenu({
  scriptureTitle = 'All Scripture',
  scriptureFileSize = '—',
  scriptureStatus = 'pending',
  scriptureProgress = 0,
  onScripturePress,
  scriptureDisabled = false,
  allowDelete = true,
  audioTitle = 'All Audio',
  audioFileSize = '—',
  audioStatus = 'pending',
  audioProgress = 0,
  onAudioPress,
  audioDisabled = false,
}: DownloadMenuProps) {
  const theme = useTheme();

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
      <Text style={[styles.title, { color: theme.textSecondary }]}>Download</Text>
      <DownloadStatusOption
        title={scriptureTitle}
        fileSize={scriptureDisabled ? '—' : scriptureFileSize}
        status={scriptureDisabled ? 'pending' : scriptureStatus}
        progress={scriptureProgress}
        onActionPress={scriptureDisabled ? undefined : onScripturePress}
        allowDelete={allowDelete}
      />
      <DownloadStatusOption
        title={audioTitle}
        fileSize={audioDisabled ? '—' : audioFileSize}
        status={audioDisabled ? 'pending' : audioStatus}
        progress={audioProgress}
        onActionPress={audioDisabled ? undefined : onAudioPress}
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
