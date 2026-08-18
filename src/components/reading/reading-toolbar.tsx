import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ChapterDownloadContext } from '@/components/reading/chapter-download-menu';
import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getToolbarTopInset, ReadingLayout, Typography } from '@/constants/theme';
import { stopPlaybackBeforeLeave } from '@/hooks/use-stop-playback-on-leave';
import { useTheme } from '@/hooks/use-theme';

export type { ChapterDownloadContext };

type ReadingToolbarProps = {
  chapterTitle?: string;
  downloadContext?: ChapterDownloadContext;
};

export function ReadingToolbar({ chapterTitle, downloadContext }: ReadingToolbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('reading');
  const insets = useSafeAreaInsets();
  const isElevated = chapterTitle != null;
  const headerBackground = isElevated ? theme.surfaceAccent : theme.background;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    RNStatusBar.setBackgroundColor(headerBackground, true);

    return () => {
      RNStatusBar.setBackgroundColor(theme.background, true);
    };
  }, [headerBackground, theme.background]);

  return (
    <View
      style={[
        styles.header,
        { paddingTop: getToolbarTopInset(insets.top), backgroundColor: headerBackground },
        isElevated && [
          styles.headerElevated,
          { shadowColor: '#000' },
        ],
      ]}>
      <View style={styles.toolbar}>
      <View style={styles.leading}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            stopPlaybackBeforeLeave();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('goBack')}>
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow_back' }}
            size={ReadingLayout.toolbarIconSize}
            color={theme.iconPrimary}
          />
        </Pressable>
        {chapterTitle ? (
          <Text
            style={[styles.chapterTitle, { color: theme.text }]}
            numberOfLines={1}>
            {chapterTitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.trailing}>
        <SettingsToolbarButton
          iconSize={ReadingLayout.toolbarSettingsIconSize}
          hitSize={ReadingLayout.toolbarIconSize}
          showTextSettings
          downloadContext={downloadContext}
        />
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  headerElevated: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ReadingLayout.toolbarHeight,
    paddingHorizontal: ReadingLayout.toolbarPaddingH,
    paddingTop: ReadingLayout.toolbarPaddingTop,
    paddingBottom: ReadingLayout.toolbarPaddingV,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarLeadingGap,
    minWidth: 0,
  },
  chapterTitle: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarTrailingGap,
    flexShrink: 0,
  },
  iconButton: {
    width: ReadingLayout.toolbarIconSize,
    height: ReadingLayout.toolbarIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
