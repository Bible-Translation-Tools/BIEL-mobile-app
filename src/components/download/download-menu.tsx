import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DownloadStatusOption, type DownloadStatusState } from './download-status-option';

type DownloadMenuProps = {
  scriptureFileSize?: string;
  scriptureState?: DownloadStatusState;
  scriptureProgress?: number;
  onScripturePress?: () => void;
};

export const DownloadMenu = memo(function DownloadMenu({
  scriptureFileSize = '—',
  scriptureState = 'default',
  scriptureProgress = 0,
  onScripturePress,
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
        title="All Scripture"
        fileSize={scriptureFileSize}
        state={scriptureState}
        progress={scriptureProgress}
        onActionPress={onScripturePress}
      />
      <DownloadStatusOption title="All Audio" fileSize="—" />
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
