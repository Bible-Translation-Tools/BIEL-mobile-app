import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DownloadMenuLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DownloadStatusOption } from './download-status-option';

const DOWNLOAD_OPTIONS = [
  { title: 'All Scripture', fileSize: '150 KB' },
  { title: 'All Audio', fileSize: '50 MB' },
] as const;

export const DownloadMenu = memo(function DownloadMenu() {
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
      {DOWNLOAD_OPTIONS.map((option) => (
        <DownloadStatusOption
          key={option.title}
          title={option.title}
          fileSize={option.fileSize}
        />
      ))}
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
